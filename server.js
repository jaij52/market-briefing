const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9'
};

app.use(express.static(path.join(__dirname, 'public')));

// ── Quotes ────────────────────────────────────────────────────────────────────
app.get('/api/quotes', async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });

  const list = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const results = {};

  await Promise.all(list.map(async (sym) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=10d`;
      const r = await fetch(url, { headers: YF_HEADERS });
      if (!r.ok) { results[sym] = { error: `HTTP ${r.status}` }; return; }

      const data = await r.json();
      const result = data?.chart?.result?.[0];
      if (!result) { results[sym] = { error: 'no data' }; return; }

      const meta = result.meta;
      const q = result.indicators?.quote?.[0] || {};
      const ts = result.timestamp || [];
      const n = ts.length;

      // filter nulls from closes
      const allCloses = (q.close || []);
      const validCloses = allCloses.filter(v => v != null);
      const weekAgoClose = validCloses.length >= 6 ? validCloses[validCloses.length - 6] : validCloses[0];

      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const price = meta.regularMarketPrice;

      results[sym] = {
        symbol: sym,
        price,
        previousClose: prevClose,
        change: prevClose ? price - prevClose : null,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
        weeklyChangePercent: weekAgoClose ? ((price - weekAgoClose) / weekAgoClose) * 100 : null,
        open: q.open?.[n - 1],
        high: q.high?.[n - 1],
        low: q.low?.[n - 1],
        close: q.close?.[n - 1],
        prevOpen: n >= 2 ? q.open?.[n - 2] : null,
        prevHigh: n >= 2 ? q.high?.[n - 2] : null,
        prevLow: n >= 2 ? q.low?.[n - 2] : null,
        prevClose2: n >= 2 ? q.close?.[n - 2] : null,
        marketState: meta.marketState,
        currency: meta.currency,
        exchangeName: meta.exchangeName,
        timestamp: meta.regularMarketTime,
        longName: meta.longName || meta.shortName || sym
      };
    } catch (e) {
      results[sym] = { error: e.message };
    }
  }));

  res.json(results);
});

// ── Technicals (SMA20/50/200, RSI14, MACD) ────────────────────────────────────
app.get('/api/technicals', async (req, res) => {
  const { symbol = '^GSPC' } = req.query;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return res.status(r.status).json({ error: `HTTP ${r.status}` });

    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'no data' });

    const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => v != null);
    const n = closes.length;

    const sma = (period) => n >= period
      ? closes.slice(n - period).reduce((a, b) => a + b, 0) / period
      : null;

    // RSI(14)
    const calcRSI = () => {
      if (n < 15) return null;
      const slice = closes.slice(Math.max(0, n - 30));
      let gains = 0, losses = 0;
      for (let i = 1; i <= 14; i++) {
        const d = slice[i] - slice[i - 1];
        d > 0 ? gains += d : losses += Math.abs(d);
      }
      let ag = gains / 14, al = losses / 14;
      for (let i = 15; i < slice.length; i++) {
        const d = slice[i] - slice[i - 1];
        ag = (ag * 13 + Math.max(d, 0)) / 14;
        al = (al * 13 + Math.max(-d, 0)) / 14;
      }
      if (al === 0) return 100;
      return +(100 - 100 / (1 + ag / al)).toFixed(2);
    };

    // MACD(12,26,9)
    const calcMACD = () => {
      if (n < 35) return null;
      const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
      let e12 = closes[0], e26 = closes[0];
      const macdArr = [];
      for (let i = 1; i < n; i++) {
        e12 = closes[i] * k12 + e12 * (1 - k12);
        e26 = closes[i] * k26 + e26 * (1 - k26);
        if (i >= 25) macdArr.push(e12 - e26);
      }
      let sig = macdArr[0];
      for (let i = 1; i < macdArr.length; i++) sig = macdArr[i] * k9 + sig * (1 - k9);
      const macdLine = macdArr[macdArr.length - 1];
      return { macd: +macdLine.toFixed(4), signal: +sig.toFixed(4), histogram: +(macdLine - sig).toFixed(4) };
    };

    const price = result.meta.regularMarketPrice;
    res.json({
      price,
      sma20: sma(20) ? +sma(20).toFixed(2) : null,
      sma50: sma(50) ? +sma(50).toFixed(2) : null,
      sma200: sma(200) ? +sma(200).toFixed(2) : null,
      rsi: calcRSI(),
      macd: calcMACD(),
      dataPoints: n,
      source: 'Yahoo Finance (finance.yahoo.com)'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── News ─────────────────────────────────────────────────────────────────────
app.get('/api/news', async (req, res) => {
  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=US+stock+market&newsCount=12&enableFuzzyQuery=false&enableNavLinks=false';
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return res.status(r.status).json([]);
    const data = await r.json();
    res.json(data?.news || []);
  } catch (e) {
    res.status(500).json([]);
  }
});

// ── Day Movers ────────────────────────────────────────────────────────────────
app.get('/api/movers', async (req, res) => {
  const results = { gainers: [], losers: [] };
  try {
    const [gRes, lRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_gainers&count=5', { headers: YF_HEADERS }),
      fetch('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_losers&count=5', { headers: YF_HEADERS })
    ]);
    if (gRes.ok) {
      const gData = await gRes.json();
      results.gainers = (gData?.finance?.result?.[0]?.quotes || []).map(q => ({
        symbol: q.symbol, name: q.shortName || q.symbol,
        price: q.regularMarketPrice, changePercent: q.regularMarketChangePercent
      }));
    }
    if (lRes.ok) {
      const lData = await lRes.json();
      results.losers = (lData?.finance?.result?.[0]?.quotes || []).map(q => ({
        symbol: q.symbol, name: q.shortName || q.symbol,
        price: q.regularMarketPrice, changePercent: q.regularMarketChangePercent
      }));
    }
  } catch (_) {}
  res.json(results);
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
