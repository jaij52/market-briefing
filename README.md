# US Morning Market Briefing

A live web dashboard that gives you a structured pre-market briefing for US stock markets — right in your browser. It pulls real-time data from Yahoo Finance and displays prices, technical indicators, sector performance, top movers, and the latest market news.

---

## Table of Contents

- [What This App Does](#what-this-app-does)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Run Locally)](#getting-started-run-locally)
- [Using the Dashboard](#using-the-dashboard)
- [API Endpoints](#api-endpoints)
- [Deployment on Render](#deployment-on-render)
- [Troubleshooting](#troubleshooting)

---

## What This App Does

When you open the app, you choose one of three briefing modes based on your trading style:

| Mode | Name | Best For |
|---|---|---|
| **A** | Intraday | Day traders who need levels, technicals, and same-day news |
| **B** | Swing | Swing traders who want a weekly view, sectors, and flows |
| **C** | Full Report | Anyone who wants the complete picture — all tabs at once |

Each mode loads a set of tabs with live market data fetched on demand from Yahoo Finance. No account or API key is required.

---

## How It Works

```
Your Browser
     │
     │  Opens index.html (the frontend)
     │
     ▼
Express Server (server.js)
     │
     │  /api/quotes      → fetches prices from Yahoo Finance
     │  /api/technicals  → calculates SMA, RSI, MACD from 1yr of data
     │  /api/news        → fetches latest market news headlines
     │  /api/movers      → fetches top day gainers & losers
     │
     ▼
Yahoo Finance API (public, no key needed)
```

The frontend is a single HTML file (`public/index.html`) that makes fetch calls to the Express backend. The backend then requests data from Yahoo Finance, processes it, and sends it back as JSON.

---

## Tech Stack

| Technology | What It's Used For |
|---|---|
| **Node.js** | JavaScript runtime — lets you run JS outside the browser |
| **Express** | Web server framework — handles HTTP routes and serves files |
| **node-fetch** | Makes HTTP requests from the server to Yahoo Finance |
| **HTML/CSS/JS** | The entire frontend UI — no frameworks, just vanilla web |
| **Render** | Cloud hosting platform where the live app runs |
| **GitHub** | Version control and source for Render deployments |

---

## Project Structure

```
market-briefing/
│
├── server.js          # The backend — Express server and all API routes
├── package.json       # Project metadata and dependency list
├── package-lock.json  # Exact versions of every installed package
│
└── public/
    └── index.html     # The entire frontend (HTML + CSS + JavaScript)
```

> **Note:** The `node_modules/` folder contains all installed packages. It is not committed to GitHub because it can be recreated with `npm install`.

---

## Getting Started (Run Locally)

Follow these steps to run the app on your own computer.

### Prerequisites

You need **Node.js** installed. To check if you already have it:

```bash
node -v
```

If you see a version number (e.g. `v20.11.0`), you're good. If not, download it from [nodejs.org](https://nodejs.org) and install the LTS version.

### Step 1 — Clone the Repository

```bash
git clone https://github.com/jaij52/market-briefing.git
cd market-briefing
```

### Step 2 — Install Dependencies

```bash
npm install
```

This reads `package.json` and downloads all required packages into a `node_modules/` folder.

### Step 3 — Start the Server

```bash
npm start
```

You should see:

```
Server running on port 3000
```

### Step 4 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

The dashboard will load and you can start using it.

---

## Using the Dashboard

1. **Choose a mode** (A, B, or C) from the landing screen
2. **Click "Fetch Data"** on any tab to load live market data
3. **Switch between tabs** using the tab bar at the top
4. **Refresh individual tabs** using the refresh button on each tab

### What Each Tab Shows

| Tab | What You'll See |
|---|---|
| Opening Brief | Key index prices, futures, VIX, and a market summary |
| Levels | Support/resistance levels and price vs. moving averages |
| Technicals | SMA 20/50/200, RSI(14), and MACD(12,26,9) for the S&P 500 |
| Options Pulse | Put/call ratios and options market sentiment |
| Global Markets | International indices and currency rates |
| Sectors | S&P 500 sector weekly % change with visual bars |
| Flows & Movers | Top 5 day gainers and top 5 day losers |
| Commodities | Oil, gold, silver, and natural gas prices |
| News | Latest US market news headlines from Yahoo Finance |
| Verdict | Summary of the overall market tone |

---

## API Endpoints

These are the backend routes that power the dashboard. You can call them directly in your browser or with a tool like Postman.

### `GET /api/quotes`

Fetches price data for one or more ticker symbols.

**Query parameter:** `symbols` — comma-separated list of tickers

**Example:**
```
GET /api/quotes?symbols=SPY,QQQ,AAPL
```

**Returns for each symbol:**
- Current price
- Previous close, daily change, daily % change
- Weekly % change
- Open, high, low, close (today and yesterday)
- Market state (regular, pre, post)
- Currency and exchange name

---

### `GET /api/technicals`

Calculates technical indicators using 1 year of daily closing prices.

**Query parameter:** `symbol` — a single ticker (default: `^GSPC` = S&P 500)

**Example:**
```
GET /api/technicals?symbol=^GSPC
```

**Returns:**
- `sma20` — 20-day Simple Moving Average
- `sma50` — 50-day Simple Moving Average
- `sma200` — 200-day Simple Moving Average
- `rsi` — Relative Strength Index (14-period)
- `macd` — MACD line, signal line, and histogram (12, 26, 9)

---

### `GET /api/news`

Fetches the latest US stock market news headlines.

**Example:**
```
GET /api/news
```

**Returns:** Array of up to 12 news articles with title, publisher, link, and publish time.

---

### `GET /api/movers`

Fetches the top 5 day gainers and top 5 day losers from Yahoo Finance screeners.

**Example:**
```
GET /api/movers
```

**Returns:**
```json
{
  "gainers": [ { "symbol": "...", "name": "...", "price": 0.00, "changePercent": 0.00 } ],
  "losers":  [ { "symbol": "...", "name": "...", "price": 0.00, "changePercent": 0.00 } ]
}
```

---

## Deployment on Render

The app is hosted on [Render](https://render.com) and automatically redeploys whenever code is pushed to the `main` branch on GitHub.

### How Deployment Works

1. You push code to GitHub: `git push origin main`
2. Render detects the new commit
3. Render pulls the code, runs `npm install`, then `npm start`
4. The new version goes live at your Render URL

### Environment

Render sets a `PORT` environment variable automatically. The server reads it like this:

```js
const PORT = process.env.PORT || 3000;
```

This means it uses Render's port in production and falls back to `3000` locally.

---

## Troubleshooting

### The page loads but data doesn't appear
Yahoo Finance occasionally rate-limits requests. Wait a few seconds and click the refresh button on the tab.

### `npm install` fails
Make sure you have Node.js installed (`node -v`) and that you're inside the `market-briefing` folder before running the command.

### Port 3000 is already in use
Another process is using that port. Either stop the other process, or start the server on a different port:

```bash
PORT=4000 npm start
```

Then open `http://localhost:4000`.

### Changes aren't showing on Render
Make sure you committed and pushed your changes:

```bash
git add .
git commit -m "your message"
git push origin main
```

Render only deploys what's on GitHub — local changes won't show until pushed.
