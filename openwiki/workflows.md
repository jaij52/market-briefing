---
title: Workflows & Operations
layout: default
permalink: /openwiki/workflows/
---

# Workflows & Operations

How to develop, extend, deploy, and troubleshoot the US Morning Market Briefing.

---

## Local Development

### Setup

```bash
# Clone the repository
git clone https://github.com/jaij52/market-briefing.git
cd market-briefing

# Install dependencies (first time only)
npm install

# Start the development server
npm start
```

The app runs on `http://localhost:3000` by default.

### Making Changes

#### Change a backend route

1. Edit `server.js`
2. Save the file
3. **Restart the server:** Stop (`Ctrl+C`) and re-run `npm start`

Example: Modify `/api/quotes` to return additional fields.

```javascript
// In server.js, around line 47:
results[sym] = {
  symbol: sym,
  price,
  // ... existing fields ...
  customField: someValue  // Add new field here
};
```

Restart and test: `GET /api/quotes?symbols=SPY`

#### Change the frontend

1. Edit `public/index.html`
2. Save the file
3. **Refresh the browser** (`F5` or `Cmd+R`)

No server restart needed. HTML/CSS/JavaScript changes are live immediately.

Example: Change the landing page text.

```html
<!-- In public/index.html, around line 169: -->
<h2>What kind of trader are you today?</h2>  <!-- Change this text -->
```

Refresh and you'll see the new text.

### Debugging

Open the browser's Developer Console (`F12` on Windows/Linux, `Cmd+Option+I` on Mac):

- **Console tab:** Check for JavaScript errors
- **Network tab:** See all fetch calls to `/api/*` endpoints
- **Application tab:** Inspect the `DATA` object in browser memory

Example: Log the response from `/api/technicals`:

```javascript
// In public/index.html, inside a tab renderer function:
console.log('Technicals data:', DATA['Technicals']);
```

Refresh the page, run the tab, and check the console.

---

## Adding New Endpoints

### Step 1: Add API route in server.js

```javascript
// At the end of server.js, before app.listen():

app.get('/api/options', async (req, res) => {
  try {
    // Fetch data from Yahoo Finance
    const url = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/SPY?modules=optionChain';
    const r = await fetch(url, { headers: YF_HEADERS });
    const data = await r.json();
    
    // Process and return
    res.json({
      callVolume: data?.optionChain?.result?.[0]?.optionChain?.callExpDate?.volume || 0,
      // ... more fields
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

Key points:
- Always use `try/catch` to prevent server crashes
- Always return valid JSON (even errors should be `{ error: "message" }`)
- Use `YF_HEADERS` to avoid being rate-limited
- Use `encodeURIComponent()` for user-provided input (ticker symbols)

### Step 2: Add tab renderer in public/index.html

Find the tab renderers section (search for `function renderOpeningBrief()`), and add a new one:

```javascript
function renderOptionsData() {
  const tab = 'Options';
  
  // Check if data is loaded
  if (!DATA[tab]) {
    return '<div class="fetch-gate"><p class="fetch-desc">Click Fetch Data to load options data</p></div>';
  }
  
  const data = DATA[tab];
  if (data.error) return `<div class="card"><span>${data.error}</span></div>`;
  
  // Build HTML
  const html = `
    <div class="card">
      <div class="card-title">Options Activity</div>
      <div class="data-grid">
        <div class="data-row">
          <span class="lbl">Call Volume:</span>
          <span class="val">${fmt(data.callVolume, 0)}</span>
        </div>
      </div>
    </div>
  `;
  
  return html;
}
```

### Step 3: Add tab to TABS object

Find the `TABS` configuration (around line 232 in `public/index.html`):

```javascript
const TABS = {
  A: ['Opening Brief','Levels','Technicals','Options Pulse','Options Data','Commodities','News','Verdict'],
  B: ['Opening Brief','Global Markets','Sectors','Flows & Movers','Commodities','News','Verdict'],
  C: ['Opening Brief','Levels','Technicals','Options Pulse','Global Markets','Sectors','Flows & Movers','Commodities','News','Verdict','Options Data']
};
```

### Step 4: Wire up the fetch call

In the `fetchTab()` function (search for `function fetchTab(tabIndex)`), add a case for your new tab:

```javascript
async function fetchTab(tabIndex) {
  const tab = TABS[MODE][tabIndex];
  if (TAB_LOADED[tab]) { switchTab(tabIndex); return; }  // Already loaded
  
  // ... existing cases ...
  
  if (tab === 'Options Data') {
    const r = await fetch('/api/options');
    DATA['Options Data'] = await r.json();
  }
  
  TAB_LOADED[tab] = true;
  renderTabContent(tabIndex);
}
```

### Step 5: Test

1. Restart the server
2. Open http://localhost:3000
3. Select a mode that includes your new tab
4. Click "Fetch Data" and verify the data appears

---

## Adding New Technical Indicators

The `/api/technicals` endpoint currently calculates SMA, RSI, and MACD. To add a new indicator:

### Step 1: Add calculation logic in server.js

Inside the `/api/technicals` route handler (around line 77), add a new calculation function:

```javascript
// Stochastic Oscillator (%K, %D)
const calcStochastic = () => {
  if (n < 14) return null;
  const slice = closes.slice(n - 14);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const k = ((closes[n-1] - low) / (high - low)) * 100;
  return { k: +k.toFixed(2), d: +k.toFixed(2) };  // D is typically 3-period SMA of K
};
```

### Step 2: Include in response

In the same function's JSON response (around line 132):

```javascript
res.json({
  price,
  sma20: sma(20) ? +sma(20).toFixed(2) : null,
  sma50: sma(50) ? +sma(50).toFixed(2) : null,
  sma200: sma(200) ? +sma(200).toFixed(2) : null,
  rsi: calcRSI(),
  macd: calcMACD(),
  stochastic: calcStochastic(),  // Add this
  dataPoints: n,
  source: 'Yahoo Finance (finance.yahoo.com)'
});
```

### Step 3: Display in frontend

In `renderTechnicals()` (search for this function in `public/index.html`):

```javascript
function renderTechnicals() {
  const tab = 'Technicals';
  if (!DATA[tab]) { /* show fetch gate */ }
  
  const data = DATA[tab];
  const html = `
    <div class="card">
      <div class="card-title">Technical Indicators</div>
      <div class="data-grid">
        <!-- ... existing SMA, RSI, MACD ... -->
        <div class="data-row">
          <span class="lbl">Stochastic %K:</span>
          <span class="val">${fmt(data.stochastic?.k, 2)}</span>
        </div>
        <div class="data-row">
          <span class="lbl">Stochastic %D:</span>
          <span class="val">${fmt(data.stochastic?.d, 2)}</span>
        </div>
      </div>
    </div>
  `;
  return html;
}
```

### Step 4: Test

Restart and fetch Technicals tab to see the new indicators.

---

## Changing Symbols or Markets

The app uses a set of predefined symbols defined in `public/index.html`:

```javascript
const SYM = {
  futures: 'ES=F',      // S&P 500 E-mini futures
  sp500: '^GSPC',       // S&P 500 index
  dow: '^DJI',          // Dow Jones
  nasdaq: '^IXIC',      // Nasdaq Composite
  vix: '^VIX',          // Volatility Index
  // ... many more
};
```

To add or change a symbol:

1. Find the `SYM` object in `public/index.html` (around line 217)
2. Add or modify a key-value pair:

```javascript
const SYM = {
  // ... existing symbols ...
  tsla: 'TSLA',         // Add Tesla
  crypto: 'GBTC',       // Add Bitcoin proxy
};
```

3. Use in fetch calls:

```javascript
const symbols = `${SYM.sp500},${SYM.vix},${SYM.tsla}`;
const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`);
```

**Note:** Yahoo Finance has a specific format for symbols:
- **Stocks:** `AAPL`, `TSLA`, etc.
- **Indices:** `^GSPC` (S&P 500), `^DJI` (Dow), `^IXIC` (Nasdaq)
- **Futures:** `ES=F` (E-mini S&P), `CL=F` (Crude oil)
- **Currencies:** `EURUSD=X`, `GBPUSD=X`
- **Crypto:** `GBTC` (Bitcoin Trust), `COIN` (Coinbase)

---

## Deployment

### Render Setup (One-time)

1. Create a Render account at https://render.com
2. Connect your GitHub repository
3. Create a new Web Service
4. In the Render dashboard:
   - **Runtime:** Node
   - **Build Command:** `npm install` (default)
   - **Start Command:** `npm start` (default)
   - **Environment:** Add `PORT` if needed (Render sets it automatically)

### Deploying Changes

```bash
# Make changes to server.js or public/index.html
git add .
git commit -m "Add new feature"
git push origin main
```

**Render automatically detects the push and redeploys.** This takes ~2–5 minutes.

Check deployment status in the Render dashboard:
1. Go to your service page
2. Look for the Deployment History section
3. Green checkmark = success, red X = failed

### Common Deployment Issues

**Deployment fails with "npm install" error:**
- Check that `package.json` has valid syntax (no trailing commas, valid JSON)
- Ensure all dependencies are listed in `package.json` (not globally installed)

**App starts but hangs or crashes:**
- Check Render's logs (Deployment → Logs)
- Likely cause: typo in code or missing dependency

**Changes don't appear after push:**
- Verify the push succeeded: `git log -1` shows your commit
- Wait 2–5 minutes for Render redeploy
- Hard refresh browser (`Ctrl+Shift+R` on Windows, `Cmd+Shift+R` on Mac)

### Port Configuration

Render sets the `PORT` environment variable automatically. The app reads it:

```javascript
const PORT = process.env.PORT || 3000;
```

- **Locally:** Uses port 3000
- **On Render:** Uses whatever Render assigns (e.g., 10000)

### Viewing Live App

After deployment:

```
https://<your-service-name>.onrender.com
```

Example: `https://market-briefing-abc123.onrender.com`

---

## Troubleshooting

### Page loads but no data appears

**Cause:** Yahoo Finance API may be rate-limiting or temporarily unavailable.

**Solutions:**
1. Wait 30 seconds and click "Fetch Data" again
2. Open browser console (`F12`) and check for network errors
3. Try fetching a different symbol (some tickers may be invalid)
4. Visit https://finance.yahoo.com directly to verify Yahoo Finance is accessible

### Data loads but looks wrong or is missing fields

**Cause:** Yahoo Finance API structure changed or endpoint returns unexpected data.

**Solutions:**
1. Check `server.js` to see if the parsing logic matches the actual API response
2. Use `fetch()` directly in browser console to inspect raw API response:
   ```javascript
   fetch('/api/quotes?symbols=SPY').then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
   ```
3. Compare response structure to expected shape in Architecture docs

### Server won't start locally

**Cause:** Port 3000 is already in use, or Node.js/npm aren't installed.

**Solutions:**

```bash
# Check if Node is installed
node -v

# Use a different port
PORT=4000 npm start

# On macOS, find and kill the process using port 3000
lsof -i :3000
kill -9 <PID>

# On Windows, find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Changes deployed to Render don't appear

**Cause:** Changes weren't pushed to GitHub, or Render is serving cached files.

**Solutions:**
```bash
# Verify changes are on GitHub
git log -1   # Should show your commit

# If not:
git add .
git commit -m "message"
git push origin main

# Hard refresh browser
# Windows/Linux: Ctrl+Shift+R
# Mac: Cmd+Shift+R
```

### npm install fails

**Cause:** Network issue, missing Node.js, or corrupt `node_modules`.

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or use npm ci (more reliable in CI/CD)
npm ci
```

### Express server errors logged

**Cause:** Typo or missing code in `server.js`.

**Solutions:**
1. Check the error message in logs: `npm start` output or Render Logs
2. Verify syntax: `node server.js` locally to catch parse errors
3. Restart: `Ctrl+C` then `npm start`

---

## Performance Optimization (Future)

If the app slows down (unlikely with current usage), consider:

1. **Caching:** Cache API responses for 30–60 seconds to reduce Yahoo Finance load
   - Store in-memory cache in `server.js`
   - Include a "Fetch Fresh Data" button to bypass cache

2. **Database:** Store historical prices/indicators to calculate trending without full recomputation
   - Use SQLite for simplicity
   - Track what users query most, optimize those endpoints

3. **Frontend:** Memoize calculations, lazy-load tabs, virtualize large tables
   - Only render visible tabs (don't render all 10 at load time)
   - Use Web Workers for heavy calculations

4. **CDN:** Serve static assets (HTML, CSS) from CDN
   - Render can do this automatically; check docs

---

## Common Maintenance Tasks

### Update Dependencies

```bash
npm outdated        # See which packages have updates
npm update          # Update to latest minor/patch versions
npm audit fix       # Fix known security vulnerabilities
```

Always test locally after updating.

### Monitor Render Logs

Visit the Render dashboard → Your Service → Logs to watch for:
- Rate limiting from Yahoo Finance (503 errors)
- Crashes or uncaught exceptions
- Unusual traffic patterns

### Backup Data

Since there's no database, no backup is needed. All data is live from Yahoo Finance.

---

## Testing

### Manual Testing Checklist

Before pushing to production, test:

- [ ] All three modes (A, B, C) load without errors
- [ ] Each tab's "Fetch Data" button works
- [ ] Technical calculations (SMA, RSI, MACD) look reasonable
- [ ] Error handling: What happens if you fetch with no internet?
- [ ] Mobile responsiveness: Does layout work on phone (375px width)?
- [ ] Refresh buttons work on individual tabs
- [ ] "New Report" button returns to mode selection

### Automated Testing (Not Currently Implemented)

To add tests, consider:

```bash
npm install --save-dev jest supertest
```

Example test for `/api/quotes`:

```javascript
// __tests__/api.quotes.test.js
const request = require('supertest');
const app = require('../server');

describe('GET /api/quotes', () => {
  test('returns quotes for valid symbol', async () => {
    const res = await request(app).get('/api/quotes?symbols=SPY');
    expect(res.statusCode).toBe(200);
    expect(res.body.SPY).toHaveProperty('price');
    expect(res.body.SPY).toHaveProperty('changePercent');
  });
});
```

Run with `npm test`.

---

## Git Workflow

### Branch Strategy

For now, the app uses a simple workflow:

1. **main branch:** Production code, deployed to Render
2. **Feature branches:** For new features or fixes

Example:

```bash
# Create a feature branch
git checkout -b feature/add-crypto-tab

# Make changes, commit
git add . && git commit -m "Add crypto assets tab"

# Push to GitHub
git push origin feature/add-crypto-tab

# Create a Pull Request on GitHub, review, merge
# Render redeploys main
```

### Commit Message Convention

Use clear, concise messages:

```
docs: expand README with beginner-friendly detail      ← Past tense, imperative
fix: bind to 0.0.0.0 for Render deployment            ← Indicates what was fixed
feat: add MACD indicator to technicals endpoint        ← New feature
```

---

## Next Steps

- **Read [Architecture](./architecture.md)** for deep dives on specific components
- **Check the [README](../README.md)** for user-facing documentation
- **Visit Render docs** at https://render.com/docs for deployment questions
- **Test locally** to understand how data flows

