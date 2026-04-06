# US Morning Market Briefing

A live trading dashboard that delivers a structured pre-market briefing for US equities. Built with Node.js/Express on the backend and a vanilla JS single-page frontend.

## Features

- **Three briefing modes:**
  - **A — Intraday:** Levels, technicals, options pulse, today's news
  - **B — Swing:** Weekly view, sectors, institutional flows, weekly news
  - **C — Full Report:** Everything — all tabs, complete picture

- **Data pulled from Yahoo Finance:**
  - Real-time quotes for major indices, futures, and ETFs
  - Technical indicators: SMA 20/50/200, RSI(14), MACD(12,26,9)
  - Day gainers and losers
  - S&P 500 sector performance (weekly % change)
  - Latest market news headlines

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JS (single `index.html`)
- **Data source:** Yahoo Finance (no API key required)
- **Hosting:** Render

## Local Development

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`.

## Deployment

The app is deployed on Render connected to the `main` branch of this repo. Any push to `main` triggers an automatic redeploy.

```bash
git push origin main
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/quotes?symbols=SPY,QQQ` | Price, change, OHLC for one or more symbols |
| `GET /api/technicals?symbol=^GSPC` | SMA 20/50/200, RSI, MACD for a symbol |
| `GET /api/news` | Latest US market news headlines |
| `GET /api/movers` | Top 5 day gainers and losers |
