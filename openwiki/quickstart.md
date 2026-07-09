---
title: Quick Start
layout: default
permalink: /openwiki/quickstart/
---

# US Morning Market Briefing — Quick Start

Welcome to the US Morning Market Briefing documentation.

## What This App Does

This is a **live web dashboard** that delivers a pre-market briefing for US stock markets. Open it in your browser, choose your trading style (intraday, swing, or full report), and see real-time market data including prices, technical indicators, sector performance, top movers, and news—all fetched live from Yahoo Finance.

Three briefing modes:

| Mode | Name | Best For |
|---|---|---|
| **A** | Intraday | Day traders needing support/resistance levels, technicals, options sentiment, same-day news |
| **B** | Swing | Swing traders wanting weekly view, sector flows, top movers, weekly news |
| **C** | Full Report | Anyone wanting the complete picture—all tabs at once |

**No account or API key required.** The app uses Yahoo Finance's public API.

---

## Quick Start: Run Locally

### Prerequisites

You need **Node.js** installed (v14 or later). Check with:

```bash
node -v
```

If you don't have it, download from [nodejs.org](https://nodejs.org) and install the LTS version.

### Step 1: Clone & Navigate

```bash
git clone https://github.com/jaij52/market-briefing.git
cd market-briefing
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs Express and node-fetch from `package.json`.

### Step 3: Start the Server

```bash
npm start
```

You should see:

```
Server running on port 3000
```

### Step 4: Open in Browser

Navigate to:

```
http://localhost:3000
```

You're ready to use the dashboard.

---

## How It Works: High-Level Overview

```
Browser (index.html)
    ↓ (fetch calls)
    ↓
Express Server (server.js)
    ↓ (HTTP requests)
    ↓
Yahoo Finance API
    ↓ (JSON responses)
    ↓
Express (parses & returns)
    ↓
Browser (renders in real-time)
```

The **frontend** (a single HTML file) lets you choose a briefing mode and select from a set of tabs (Opening Brief, Levels, Technicals, etc.). When you click "Fetch Data" or a refresh button, it calls the backend.

The **backend** (Express server) has four main API endpoints:

- `/api/quotes` — Fetches current prices and OHLC data
- `/api/technicals` — Calculates technical indicators (SMA 20/50/200, RSI, MACD)
- `/api/news` — Fetches latest market news headlines
- `/api/movers` — Fetches top 5 gainers and losers

All data comes from Yahoo Finance. No database, no authentication.

---

## Project Structure

```
market-briefing/
├── server.js              # Express backend: all API routes and calculations
├── package.json           # Dependencies: express, node-fetch
├── package-lock.json      # Locked versions
├── fly.toml               # Render deployment config
├── public/
│   └── index.html         # Single-file frontend: HTML + CSS + JavaScript
└── node_modules/          # Installed packages (not in git)
```

**Key insight:** This is a very small, focused codebase. All backend logic lives in one file (`server.js`), and the entire frontend is one HTML file (`public/index.html`).

---

## Documentation Map

- **[Architecture](./architecture.md)** — Technical deep dive: API endpoints, frontend structure, how calculations work
- **[Workflows](./workflows.md)** — How to develop, extend, deploy, and troubleshoot

---

## Key Concepts

### Technical Indicators

The app calculates three main indicators from 1 year of daily closing prices:

- **SMA (Simple Moving Averages):** 20-day, 50-day, 200-day trend lines
- **RSI (Relative Strength Index):** 14-period momentum oscillator (0–100 scale)
- **MACD (Moving Average Convergence Divergence):** Trend-following momentum with signal line

See [Architecture](./architecture.md#technical-calculations) for implementation details.

### Pivot Points

Support and resistance levels calculated from yesterday's high, low, and close:

- **P** — Pivot Point (center)
- **R1, R2** — Resistance levels (above pivot)
- **S1, S2** — Support levels (below pivot)

### Briefing Modes

Modes control which tabs appear and what data is fetched:

- **Mode A (Intraday):** 7 tabs focused on day-trading levels and technicals
- **Mode B (Swing):** 7 tabs focused on weekly trends and sector flows
- **Mode C (Full Report):** 10 tabs with everything

---

## Common Tasks

### Run the app locally

```bash
npm start
# Open http://localhost:3000
```

### Change the port

```bash
PORT=4000 npm start
# Open http://localhost:4000
```

### Check what tabs are available

Look at the `TABS` object in `public/index.html` (search for `const TABS = {`). It defines which tabs show for each mode.

### Add a new API endpoint

1. Add a new `app.get(...)` route in `server.js`
2. Call it from the frontend in `public/index.html` (search for `fetch('/api/quotes'...`)
3. Add a renderer function to handle the response

### Deploy to production

Push to GitHub `main` branch. Render automatically redeploys. See [Workflows](./workflows.md#deployment) for details.

---

## Troubleshooting

**Page loads but data doesn't appear**
- Yahoo Finance may rate-limit requests. Wait a few seconds and click refresh.
- Check browser console (F12) for network errors.

**`npm install` fails**
- Make sure Node.js is installed: `node -v`
- Make sure you're in the `market-briefing` folder.

**Port 3000 is already in use**
- Use a different port: `PORT=4000 npm start`

**Changes don't appear on Render**
- Render only deploys what's on GitHub's `main` branch.
- Commit and push: `git add . && git commit -m "message" && git push origin main`

See [Workflows](./workflows.md#troubleshooting) for more solutions.

---

## Next Steps

1. **Run locally** to understand the dashboard.
2. **Read [Architecture](./architecture.md)** to understand the technical implementation.
3. **Read [Workflows](./workflows.md)** if you need to extend the app or deploy changes.

---

## Useful Links

- **Live App:** (Render URL — set up in your fork)
- **Repository:** https://github.com/jaij52/market-briefing
- **Yahoo Finance API Docs:** https://finance.yahoo.com (unofficial endpoints, no key required)
- **Node.js Docs:** https://nodejs.org/docs
- **Express Docs:** https://expressjs.com
