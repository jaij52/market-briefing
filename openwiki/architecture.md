---
title: Architecture
layout: default
permalink: /openwiki/architecture/
---

# Architecture

This page explains the technical structure of the US Morning Market Briefing application.

---

## Overview

The app is a **client-server web application**:

- **Frontend:** Single HTML file (`public/index.html`) with embedded CSS and JavaScript
- **Backend:** Node.js/Express server (`server.js`) with four API endpoints
- **Data Source:** Yahoo Finance public API (no authentication required)
- **Hosting:** Render.com (auto-deploys from GitHub)

```
┌─────────────────────┐
│   Browser (User)    │
│  ┌───────────────┐  │
│  │  index.html   │  │  Single HTML file with:
│  │ (CSS + JS)    │  │  - Mode selection (A/B/C)
│  └───────────────┘  │  - Tab system
└──────────┬──────────┘  - Real-time rendering
           │
      fetch() API calls
           │
┌──────────▼──────────┐
│   Express Server    │  Routes HTTP requests
│   (server.js)       │
│ ┌─────────────────┐ │
│ │ /api/quotes     │ │  Fetch prices, OHLC
│ │ /api/technicals │ │  Calculate SMA, RSI, MACD
│ │ /api/news       │ │  Fetch headlines
│ │ /api/movers     │ │  Top gainers & losers
│ └─────────────────┘ │
└──────────┬──────────┘
           │
     HTTP requests
           │
┌──────────▼────────────────┐
│  Yahoo Finance API        │
│ query1.finance.yahoo.com  │
│ (public endpoints)        │
└───────────────────────────┘
```

---

## Backend: server.js

The Express server handles all API logic. Here's what happens:

### Server Startup

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
// Serves static files from public/ folder

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

Key points:
- Binds to `0.0.0.0` (all network interfaces) to work on Render
- Falls back to port 3000 locally; uses `process.env.PORT` in production
- Serves the `public/` folder as static files

### Yahoo Finance Headers

Every request to Yahoo Finance includes this User-Agent header to avoid being blocked:

```javascript
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9'
};
```

---

## API Endpoints

### 1. `GET /api/quotes`

**Purpose:** Fetch current price and OHLC data for one or more symbols.

**Query parameter:** `symbols` — comma-separated ticker list

**Example request:**

```
GET /api/quotes?symbols=SPY,QQQ,AAPL,^GSPC,^VIX
```

**What it does:**

1. Splits the symbols list
2. For each symbol, fetches the Yahoo Finance chart endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=10d`
3. Extracts from the response:
   - Current price and previous close (for daily change)
   - Open, high, low, close for today and yesterday
   - Weekly % change (price vs. 6-trading-days-ago close)
   - Market state (REGULAR, PRE, POST, CLOSED)
   - Currency and exchange name

**Response structure (for each symbol):**

```json
{
  "SPY": {
    "symbol": "SPY",
    "price": 550.25,
    "previousClose": 549.00,
    "change": 1.25,
    "changePercent": 0.23,
    "weeklyChangePercent": 1.50,
    "open": 548.50,
    "high": 551.00,
    "low": 548.00,
    "close": 550.25,
    "prevOpen": 549.75,
    "prevHigh": 550.50,
    "prevLow": 548.25,
    "prevClose2": 549.00,
    "marketState": "REGULAR",
    "currency": "USD",
    "exchangeName": "NMS",
    "timestamp": 1709913600,
    "longName": "SPDR S&P 500 ETF Trust"
  }
}
```

**Error handling:** If a symbol fails, that entry gets an `error` field instead of data.

**Source:** `server.js` lines 16–74

---

### 2. `GET /api/technicals`

**Purpose:** Calculate technical indicators (SMA, RSI, MACD) using 1 year of daily data.

**Query parameter:** `symbol` — a single ticker (default: `^GSPC` = S&P 500)

**Example request:**

```
GET /api/technicals?symbol=^GSPC
```

**What it does:**

1. Fetches 1 year of daily closing prices: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y`
2. Filters out null closing prices
3. Calculates three indicators on the valid closes (see [Technical Calculations](#technical-calculations) below)
4. Returns results

**Response structure:**

```json
{
  "price": 5230.15,
  "sma20": 5210.25,
  "sma50": 5180.50,
  "sma200": 5100.75,
  "rsi": 62.45,
  "macd": {
    "macd": 42.3456,
    "signal": 38.1234,
    "histogram": 4.2222
  },
  "dataPoints": 252,
  "source": "Yahoo Finance (finance.yahoo.com)"
}
```

**Use case:** The frontend requests this when rendering the "Technicals" tab to show market momentum and trend direction.

**Source:** `server.js` lines 76–145

---

### 3. `GET /api/news`

**Purpose:** Fetch latest US stock market news headlines.

**Query parameter:** None

**Example request:**

```
GET /api/news
```

**What it does:**

1. Calls Yahoo Finance search endpoint with `q=US+stock+market&newsCount=12`
2. Extracts headlines from the response
3. Returns array of up to 12 news articles

**Response structure:**

```json
[
  {
    "uuid": "...",
    "title": "Fed Chief Says Rate Hikes May Be Done",
    "publisher": "CNBC",
    "link": "https://...",
    "pubDate": 1709913600,
    "type": "news"
  },
  ...
]
```

**Error handling:** If the request fails, returns empty array `[]`.

**Source:** `server.js` lines 147–158

---

### 4. `GET /api/movers`

**Purpose:** Fetch top 5 day gainers and top 5 day losers.

**Query parameter:** None

**Example request:**

```
GET /api/movers
```

**What it does:**

1. Makes parallel requests to two Yahoo Finance screener endpoints:
   - Gainers: `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=5`
   - Losers: `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers&count=5`
2. Parses each response and extracts symbol, name, price, and % change
3. Returns both arrays

**Response structure:**

```json
{
  "gainers": [
    { "symbol": "NVDA", "name": "NVIDIA Corp.", "price": 950.25, "changePercent": 5.2 },
    ...
  ],
  "losers": [
    { "symbol": "GM", "name": "General Motors Co.", "price": 35.10, "changePercent": -4.8 },
    ...
  ]
}
```

**Error handling:** If either request fails, that array defaults to `[]`.

**Source:** `server.js` lines 160–184

---

## Technical Calculations

All calculations run on the server to avoid heavy computation in the browser. Here's how they work:

### Simple Moving Averages (SMA)

**SMA20, SMA50, SMA200:** Average of the last N closing prices.

```javascript
const sma = (period) => n >= period
  ? closes.slice(n - period).reduce((a, b) => a + b, 0) / period
  : null;
```

- `sma(20)` = average of the last 20 closing prices
- `sma(50)` = average of the last 50 closing prices
- `sma(200)` = average of the last 200 closing prices

**Interpretation:**
- Price above all three SMAs = uptrend
- Price below all three SMAs = downtrend
- Price between SMAs = consolidation

### Relative Strength Index (RSI)

**RSI(14):** Momentum oscillator measuring the magnitude of recent gains vs. losses. Ranges 0–100.

Algorithm:
1. Take the last 30 closes and calculate gains and losses for 14 periods
2. Average the gains (`ag`) and losses (`al`)
3. For remaining periods, use exponential smoothing:
   ```javascript
   ag = (ag * 13 + max(change, 0)) / 14
   al = (al * 13 + max(-change, 0)) / 14
   ```
4. Calculate RSI:
   ```javascript
   RSI = 100 - (100 / (1 + ag/al))
   ```

**Interpretation:**
- RSI < 30 = Oversold (potential bounce)
- RSI 30–70 = Neutral
- RSI > 70 = Overbought (potential pullback)

**Source:** `server.js` lines 96–112

### MACD (12, 26, 9)

**MACD:** Trend-following momentum indicator using exponential moving averages.

Algorithm:
1. Calculate 12-period EMA (`e12`) and 26-period EMA (`e26`) of closing prices
2. MACD line = e12 − e26
3. Signal line = 9-period EMA of MACD line
4. Histogram = MACD line − Signal line

```javascript
const k12 = 2/13, k26 = 2/27, k9 = 2/10;  // Smoothing constants
let e12 = closes[0], e26 = closes[0];

for (let i = 1; i < n; i++) {
  e12 = closes[i] * k12 + e12 * (1 - k12);
  e26 = closes[i] * k26 + e26 * (1 - k26);
  if (i >= 25) macdArr.push(e12 - e26);
}
```

**Interpretation:**
- MACD > Signal = Bullish (buy signal)
- MACD < Signal = Bearish (sell signal)
- Histogram crossing zero = Momentum shift

**Source:** `server.js` lines 114–129

### Pivot Points

**Pivot Points:** Support and resistance levels calculated from yesterday's OHLC.

```javascript
const p = (h + l + c) / 3;  // Pivot Point
const R1 = 2*p - l;          // First Resistance
const R2 = p + (h - l);      // Second Resistance
const S1 = 2*p - h;          // First Support
const S2 = p - (h - l);      // Second Support
```

**Use case:** Help identify intraday support/resistance levels. Used in Mode A (Intraday).

**Source:** `public/index.html` (search for `calcPivots`)

---

## Frontend: public/index.html

The entire frontend is one HTML file. It's organized into three main sections:

### 1. CSS Styling

```html
<style>
:root {
  --bg: #0d1117;     /* Dark background (GitHub-like) */
  --text: #e6edf3;   /* Light text */
  --green: #3fb950;  /* Positive price changes */
  --red: #f85149;    /* Negative price changes */
  ...
}
</style>
```

The app uses a dark GitHub-inspired theme with semantic color coding:
- **Green** for gains/bullish signals
- **Red** for losses/bearish signals
- **Amber** for neutral/mixed signals
- **Blue** for informational highlights

### 2. HTML Structure

Two main sections:

**Landing Screen** (`#landing`):
- Shows three mode buttons (A, B, C)
- User selects their trading style

**Report Screen** (`#report`):
- Header with mode badge and "New Report" button
- Tab bar showing available tabs for the selected mode
- Tab pane container for rendering data

```html
<div id="landing"><!-- Mode selection --></div>
<div id="report">
  <div class="rpt-header"></div>
  <div class="tab-bar" id="tab-bar"></div>
  <div id="tab-content"></div>
</div>
```

### 3. JavaScript Logic

The JavaScript is organized into sections:

#### State Management

```javascript
const TABS = {
  A: ['Opening Brief','Levels','Technicals','Options Pulse','Commodities','News','Verdict'],
  B: ['Opening Brief','Global Markets','Sectors','Flows & Movers','Commodities','News','Verdict'],
  C: ['Opening Brief','Levels','Technicals','Options Pulse','Global Markets','Sectors','Flows & Movers','Commodities','News','Verdict']
};

let MODE = null;          // Current mode (A, B, or C)
let DATA = {};            // Cached API responses
let CURRENT_TAB = 0;      // Active tab index
let TAB_LOADED = {};      // Track which tabs have fetched data
```

#### Mode Selection (`selectMode(mode)`)

1. Sets `MODE` to A, B, or C
2. Hides landing screen, shows report screen
3. Populates tab bar based on `TABS[MODE]`
4. Renders the first tab

#### Fetching Data (`fetchTab(tabIndex)`)

When user clicks "Fetch Data" or refresh:

1. Get the tab name from `TABS[MODE][tabIndex]`
2. Call the appropriate API endpoint (e.g., `/api/quotes?symbols=SPY,^VIX,...`)
3. Store response in `DATA`
4. Mark tab as loaded in `TAB_LOADED`
5. Call the renderer function for that tab

#### Tab Rendering

Each tab has a dedicated renderer function:

- `renderOpeningBrief()` — Shows key indices, VIX, market summary
- `renderLevels()` — Shows support/resistance pivots, price vs. SMAs
- `renderTechnicals()` — Shows SMA20/50/200, RSI, MACD
- `renderOptionsPulse()` — Shows put/call ratios (mock data for now)
- `renderGlobalMarkets()` — Shows international indices, currencies
- `renderSectors()` — Shows S&P 500 sector performance
- `renderFlowsMovers()` — Shows top gainers and losers
- `renderCommodities()` — Shows oil, gold, silver, natural gas
- `renderNews()` — Shows market headlines
- `renderVerdict()` — Shows overall market tone and key levels

Each renderer:
1. Checks if data is loaded (`DATA[tab]`)
2. Formats numbers and colors appropriately
3. Builds HTML cards and tables
4. Inserts into `#tab-content`

#### Utility Functions

- `fmt(n, decimals)` — Format number with locale strings (comma separators)
- `fmtPct(n)` — Format as percentage with sign
- `colorClass(v)` — Returns CSS class for color (pos/neg/neu)
- `freshLabel(timestamp, marketState)` — Returns "Live", "Delayed", "Close" badge
- `interpretVIX(v)` — Returns interpretation of VIX level
- `interpretRSI(v)` — Returns interpretation of RSI value
- `calcPivots(h, l, c)` — Calculates pivot points

---

## Data Flow Example: "Fetch Technicals" Tab

Here's what happens when a user clicks "Fetch Data" on the Technicals tab:

```
1. User clicks "Fetch Data" on Technicals tab
   ↓
2. frontend calls fetchTab(2) [Technicals = index 2 for Mode A]
   ↓
3. Browser calls: fetch('/api/technicals?symbol=^GSPC')
   ↓
4. Server receives request in app.get('/api/technicals', ...)
   ↓
5. Server fetches 1 year of data from Yahoo Finance
   ↓
6. Server calculates SMA(20), SMA(50), SMA(200), RSI(14), MACD(12,26,9)
   ↓
7. Server returns JSON with all indicators
   ↓
8. Frontend receives response, stores in DATA['Technicals']
   ↓
9. Frontend calls renderTechnicals()
   ↓
10. renderTechnicals() builds HTML with:
    - Current price
    - Three SMAs with color indicators
    - RSI with interpretation
    - MACD values
    - Sparkline or chart (if implemented)
    ↓
11. HTML inserted into #tab-content, user sees data
```

---

## Dependencies

### Production Dependencies (package.json)

```json
{
  "express": "^4.18.2",
  "node-fetch": "^2.7.0"
}
```

- **Express:** Web server framework for routing HTTP requests
- **node-fetch:** Makes HTTP requests to Yahoo Finance API

### No Runtime Database

This app does not use a database. All data is:
- Fetched live from Yahoo Finance on each request
- Cached temporarily in browser memory (`DATA` object)
- Lost on page refresh

This keeps the app simple and always current, but means the backend can't persist user preferences or historical snapshots.

---

## Error Handling

### Frontend

- If a fetch fails, the UI shows "Data unavailable" or empty state
- Rate limiting from Yahoo Finance typically shows as missing data; user can retry

### Backend

- Network errors from Yahoo Finance are caught and returned as `{ error: "message" }`
- Malformed responses default to `{}` or `[]` (safe fallbacks)
- Server never crashes; always returns valid JSON

---

## Performance Considerations

1. **No caching:** Every "Fetch Data" click hits Yahoo Finance. Rate limiting can occur during heavy usage.
2. **Parallel requests:** Backend uses `Promise.all()` to fetch multiple symbols concurrently for `/api/quotes`.
3. **Frontend rendering:** All rendering is synchronous; with hundreds of data points, UI can briefly freeze, but not with typical usage.
4. **Data transfer:** Responses are usually 1–50 KB, well under typical bandwidth limits.

---

## Security

- **No authentication:** App is open to anyone. No user data stored.
- **No secrets:** No API keys, passwords, or tokens in the code.
- **CORS:** Not explicitly configured. Frontend and backend are same-origin, so no CORS issues.
- **Input validation:** Ticker symbols are URL-encoded before sent to Yahoo Finance; limits injection risk.
- **Rate limiting:** Yahoo Finance may rate-limit individual IPs; no mitigations in code.

---

## Testing

Currently there are no automated tests. Manual testing workflow:

1. Run `npm start`
2. Open http://localhost:3000
3. Select a mode (A, B, or C)
4. Click "Fetch Data" on each tab
5. Verify data appears and calculations look correct
6. Check browser console (F12) for any errors

---

## Source Map

| File | Purpose | Key Lines |
|------|---------|-----------|
| `server.js` | Express app, API routes, calculations | 1–189 |
| `public/index.html` | Frontend UI, mode selection, tab system | 1–1000+ |
| `package.json` | Dependencies | 1–13 |
| `fly.toml` | Render deployment config | 1–16 |

