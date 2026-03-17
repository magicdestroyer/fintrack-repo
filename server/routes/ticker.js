/**
 * routes/ticker.js — Yahoo Finance proxy v2.0.0
 *
 * All price data fetched server-side, eliminating CORS issues.
 * Results cached in SQLite for PRICE_CACHE_TTL_S seconds (default 15 min).
 *
 * GET /api/ticker/lookup?q=SCHB        — search + price autofill
 * GET /api/ticker/quote?t=SCHB         — full quote for one ticker
 * GET /api/ticker/batch?t=SCHB,VTI,SPY — batch quotes (max 50)
 * GET /api/ticker/history?t=SCHB&range=1mo — OHLCV history
 * GET /api/ticker/search?q=schwab      — company name search
 */

const express        = require('express');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const db             = require('../db');

const router = express.Router();

// ── Yahoo Finance endpoints ───────────────────────────────────────────────────
const YF = {
  SEARCH: 'https://query1.finance.yahoo.com/v1/finance/search',
  QUOTE:  'https://query1.finance.yahoo.com/v7/finance/quote',
  CHART:  'https://query1.finance.yahoo.com/v8/finance/chart',
};

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':     'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':    'https://finance.yahoo.com/',
  'Origin':     'https://finance.yahoo.com',
};

const HISTORY_INTERVALS = {
  '1d':  '5m',  '5d': '15m', '1mo': '1d',
  '3mo': '1d',  '6mo':'1d',  'ytd': '1d',
  '1y':  '1d',  '2y': '1wk', '5y':  '1mo',
  '10y': '1mo', 'max':'3mo',
};

// ── Fetch helper with timeout and retry ───────────────────────────────────────
async function yfFetch(url, timeoutMs = 8000, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Prefer native fetch (Node 18+), fall back to node-fetch
      const fetchFn = globalThis.fetch || require('node-fetch');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchFn(url, { headers: YF_HEADERS, signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Normalise Yahoo Finance quote object ─────────────────────────────────────
function normalizeQuote(q) {
  return {
    ticker:        (q.symbol || '').toUpperCase(),
    name:          q.longName || q.shortName || q.symbol || '',
    price:         q.regularMarketPrice          ?? null,
    previousClose: q.regularMarketPreviousClose  ?? null,
    open:          q.regularMarketOpen           ?? null,
    dayLow:        q.regularMarketDayLow         ?? null,
    dayHigh:       q.regularMarketDayHigh        ?? null,
    change:        q.regularMarketChange         ?? null,
    changePct:     q.regularMarketChangePercent  ?? null,
    volume:        q.regularMarketVolume         ?? null,
    avgVolume:     q.averageDailyVolume3Month    ?? null,
    marketCap:     q.marketCap                   ?? null,
    peRatio:       q.trailingPE                  ?? null,
    forwardPE:     q.forwardPE                   ?? null,
    eps:           q.epsTrailingTwelveMonths      ?? null,
    dividend:      q.trailingAnnualDividendRate   ?? null,
    dividendYield: q.trailingAnnualDividendYield  ?? null,
    beta:          q.beta                         ?? null,
    week52Low:     q.fiftyTwoWeekLow              ?? null,
    week52High:    q.fiftyTwoWeekHigh             ?? null,
    expenseRatio:  q.annualReportExpenseRatio      ?? null,
    currency:      q.currency  || 'USD',
    exchange:      q.fullExchangeName || q.exchange || '',
    quoteType:     q.quoteType || '',
    // Extended-hours data
    preMarketPrice:  q.preMarketPrice  ?? null,
    postMarketPrice: q.postMarketPrice ?? null,
    fetchedAt:     new Date().toISOString(),
  };
}

// ── GET /api/ticker/lookup ────────────────────────────────────────────────────
// Lightweight: ticker → name + price (used for autofill while typing)
router.get('/lookup', optionalAuth, async (req, res) => {
  const q = (req.query.q || '').trim().toUpperCase();
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

  // Serve from cache if fresh
  const cached = db.getCachedPrice(q);
  if (cached) return res.json({ result: cached, cached: true });

  try {
    // Direct quote (fastest path for known tickers)
    const quoteUrl = `${YF.QUOTE}?symbols=${encodeURIComponent(q)}&fields=longName,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,quoteType,exchange,currency`;
    const quoteData = await yfFetch(quoteUrl);
    const quotes    = quoteData?.quoteResponse?.result || [];

    if (quotes.length) {
      const result = normalizeQuote(quotes[0]);
      db.setCachedPrice(q, result);
      return res.json({ result, cached: false });
    }

    // Fallback: search by company name
    const searchUrl  = `${YF.SEARCH}?q=${encodeURIComponent(q)}&quotesCount=1&newsCount=0&listsCount=0`;
    const searchData = await yfFetch(searchUrl);
    const best       = (searchData?.quotes || [])[0];

    if (!best) return res.status(404).json({ error: `No results found for "${q}".` });

    const result = {
      ticker:    (best.symbol || q).toUpperCase(),
      name:      best.longname || best.shortname || best.symbol || q,
      price:     null,
      exchange:  best.exchange || '',
      quoteType: best.quoteType || '',
      fetchedAt: new Date().toISOString(),
    };
    // Don't cache name-only results
    return res.json({ result, cached: false });
  } catch (err) {
    console.error(`[ticker lookup ${q}]`, err.message);
    return res.status(502).json({ error: 'Price data temporarily unavailable. Please try again.' });
  }
});

// ── GET /api/ticker/quote ─────────────────────────────────────────────────────
// Full quote for one ticker (all fields)
router.get('/quote', requireAuth, async (req, res) => {
  const ticker = (req.query.t || '').trim().toUpperCase();
  if (!ticker) return res.status(400).json({ error: 'Query param "t" (ticker) is required.' });

  const cached = db.getCachedPrice(ticker);
  if (cached) return res.json({ quote: cached, cached: true });

  try {
    const data   = await yfFetch(`${YF.QUOTE}?symbols=${encodeURIComponent(ticker)}`);
    const quotes = data?.quoteResponse?.result || [];
    if (!quotes.length) return res.status(404).json({ error: `No quote found for "${ticker}".` });

    const quote = normalizeQuote(quotes[0]);
    db.setCachedPrice(ticker, quote);
    return res.json({ quote, cached: false });
  } catch (err) {
    console.error(`[ticker quote ${ticker}]`, err.message);
    return res.status(502).json({ error: 'Price data temporarily unavailable.' });
  }
});

// ── GET /api/ticker/batch ─────────────────────────────────────────────────────
// Quotes for multiple tickers in one call — e.g. ?t=SCHB,VTI,SPY
router.get('/batch', requireAuth, async (req, res) => {
  const raw = (req.query.t || '').trim().toUpperCase();
  if (!raw) return res.status(400).json({ error: 'Query param "t" (comma-separated tickers) required.' });

  const tickers = [...new Set(raw.split(',').map(t => t.trim()).filter(Boolean))];
  if (tickers.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 tickers per batch request.' });
  }

  const results    = {};
  const needFetch  = [];

  for (const t of tickers) {
    const cached = db.getCachedPrice(t);
    if (cached) results[t] = { ...cached, cached: true };
    else needFetch.push(t);
  }

  if (needFetch.length) {
    try {
      const url    = `${YF.QUOTE}?symbols=${encodeURIComponent(needFetch.join(','))}`;
      const data   = await yfFetch(url);
      const quotes = data?.quoteResponse?.result || [];

      for (const q of quotes) {
        const normalized = normalizeQuote(q);
        db.setCachedPrice(normalized.ticker, normalized);
        results[normalized.ticker] = { ...normalized, cached: false };
      }
      // Mark any missing tickers
      for (const t of needFetch) {
        if (!results[t]) results[t] = { ticker: t, error: 'Not found on Yahoo Finance' };
      }
    } catch (err) {
      console.error('[ticker batch]', err.message);
      for (const t of needFetch) {
        if (!results[t]) results[t] = { ticker: t, error: 'Price data temporarily unavailable' };
      }
    }
  }

  return res.json({ results, count: Object.keys(results).length });
});

// ── GET /api/ticker/history ───────────────────────────────────────────────────
// OHLCV price history for chart slicers
// ?t=SCHB&range=1mo&includePrePost=false
router.get('/history', requireAuth, async (req, res) => {
  const ticker  = (req.query.t     || '').trim().toUpperCase();
  const range   = (req.query.range || '1mo').toLowerCase();
  const prePost = req.query.includePrePost === 'true' ? 'true' : 'false';

  if (!ticker) return res.status(400).json({ error: 'Query param "t" (ticker) required.' });

  if (!HISTORY_INTERVALS[range]) {
    return res.status(400).json({
      error: `Invalid range. Valid values: ${Object.keys(HISTORY_INTERVALS).join(', ')}`,
    });
  }

  const interval = HISTORY_INTERVALS[range];
  const cacheKey = `${ticker}_hist_${range}`;
  const cached   = db.getCachedPrice(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const url  = `${YF.CHART}/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}&includePrePost=${prePost}&events=div,splits`;
    const data = await yfFetch(url);
    const result = data?.chart?.result?.[0];

    if (!result) return res.status(404).json({ error: `No history found for ${ticker}` });

    const ts     = result.timestamp   || [];
    const ohlcv  = result.indicators?.quote?.[0] || {};
    const meta   = result.meta || {};

    const points = ts.map((t, i) => ({
      date:   new Date(t * 1000).toISOString().split('T')[0],
      open:   ohlcv.open?.[i]   != null ? +ohlcv.open[i].toFixed(4)   : null,
      high:   ohlcv.high?.[i]   != null ? +ohlcv.high[i].toFixed(4)   : null,
      low:    ohlcv.low?.[i]    != null ? +ohlcv.low[i].toFixed(4)    : null,
      close:  ohlcv.close?.[i]  != null ? +ohlcv.close[i].toFixed(4)  : null,
      volume: ohlcv.volume?.[i] ?? null,
    })).filter(p => p.close !== null);

    const payload = {
      ticker,
      range,
      interval,
      currency:     meta.currency     || 'USD',
      name:         meta.shortName    || ticker,
      currentPrice: meta.regularMarketPrice || null,
      previousClose:meta.chartPreviousClose || null,
      points,
      fetchedAt:    new Date().toISOString(),
    };

    // Cache history slightly longer (30 min) to reduce load
    db.setCachedPrice(cacheKey, payload);
    return res.json({ ...payload, cached: false });
  } catch (err) {
    console.error(`[ticker history ${ticker}]`, err.message);
    return res.status(502).json({ error: 'Historical data temporarily unavailable.' });
  }
});

// ── GET /api/ticker/search ────────────────────────────────────────────────────
// Free-text company name search — returns top 8 matches
router.get('/search', optionalAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }

  try {
    const url  = `${YF.SEARCH}?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`;
    const data = await yfFetch(url);
    const quotes = (data?.quotes || []).map(sq => ({
      ticker:    sq.symbol,
      name:      sq.longname || sq.shortname || sq.symbol,
      exchange:  sq.exchange,
      quoteType: sq.quoteType,
    }));
    return res.json({ results: quotes });
  } catch (err) {
    console.error('[ticker search]', err.message);
    return res.status(502).json({ error: 'Search temporarily unavailable.' });
  }
});

module.exports = router;
