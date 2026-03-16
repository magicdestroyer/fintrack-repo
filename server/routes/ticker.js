/**
 * routes/ticker.js — Yahoo Finance proxy endpoints
 *
 * Proxies Yahoo Finance API requests server-side to avoid CORS errors.
 * Results are cached in SQLite for 15 minutes to avoid rate limiting.
 *
 * GET /api/ticker/lookup?q=SCHB    — Search for ticker, returns name + current price
 * GET /api/ticker/quote?t=SCHB     — Detailed quote for one ticker
 * GET /api/ticker/batch?t=A,B,C    — Batch quotes for multiple tickers
 */

const express = require('express');
const fetch = require('node-fetch');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Yahoo Finance base URLs ──────────────────────────────────────────────────
const YF_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';
const YF_QUOTE  = 'https://query1.finance.yahoo.com/v7/finance/quote';

// Common headers Yahoo Finance expects
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; FinTrack/1.0)',
  'Accept': 'application/json',
};

// ── Helper: fetch with timeout ───────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers: YF_HEADERS });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Helper: normalize a Yahoo Finance quote result ───────────────────────────
function normalizeQuote(q) {
  return {
    ticker:       (q.symbol || '').toUpperCase(),
    name:         q.longName || q.shortName || q.symbol || '',
    price:        q.regularMarketPrice ?? null,
    previousClose:q.regularMarketPreviousClose ?? null,
    change:       q.regularMarketChange ?? null,
    changePct:    q.regularMarketChangePercent ?? null,
    marketCap:    q.marketCap ?? null,
    volume:       q.regularMarketVolume ?? null,
    avgVolume:    q.averageDailyVolume3Month ?? null,
    peRatio:      q.trailingPE ?? null,
    forwardPE:    q.forwardPE ?? null,
    fiftyTwoWkLow:  q['52WeekLow']  ?? q.fiftyTwoWeekLow  ?? null,
    fiftyTwoWkHigh: q['52WeekHigh'] ?? q.fiftyTwoWeekHigh ?? null,
    currency:     q.currency || 'USD',
    exchange:     q.fullExchangeName || q.exchange || '',
    quoteType:    q.quoteType || '',
    expenseRatio: q.annualReportExpenseRatio ?? null, // for ETFs
    fetchedAt:    new Date().toISOString(),
  };
}

// ── GET /api/ticker/lookup ───────────────────────────────────────────────────
// Lightweight search — returns name + price for quick auto-fill
// Auth optional so the add-ticker widget works before the user is fully synced
router.get('/lookup', async (req, res) => {
  const q = (req.query.q || '').trim().toUpperCase();
  if (!q || q.length < 1) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  // Check cache first
  const cached = db.getCachedPrice(q);
  if (cached) return res.json({ result: cached, cached: true });

  try {
    // Try direct quote first (faster if we know the exact ticker)
    const quoteRes = await fetchWithTimeout(
      `${YF_QUOTE}?symbols=${encodeURIComponent(q)}&fields=longName,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,quoteType,exchange`
    );
    const quoteData = await quoteRes.json();
    const quotes = quoteData?.quoteResponse?.result || [];

    if (quotes.length > 0) {
      const result = normalizeQuote(quotes[0]);
      db.setCachedPrice(q, result);
      return res.json({ result, cached: false });
    }

    // Fall back to search if direct quote returned nothing
    const searchRes = await fetchWithTimeout(
      `${YF_SEARCH}?q=${encodeURIComponent(q)}&quotesCount=1&newsCount=0&listsCount=0`
    );
    const searchData = await searchRes.json();
    const searchQuotes = searchData?.quotes || [];

    if (searchQuotes.length === 0) {
      return res.status(404).json({ error: `No results found for "${q}".` });
    }

    // The search result has less data — just return name for auto-fill
    const best = searchQuotes[0];
    const result = {
      ticker:   (best.symbol || q).toUpperCase(),
      name:     best.longname || best.shortname || best.symbol || q,
      price:    null, // search endpoint doesn't include price
      exchange: best.exchange || '',
      quoteType:best.quoteType || '',
      fetchedAt:new Date().toISOString(),
    };
    // Don't cache name-only results — next call should get real price
    return res.json({ result, cached: false });

  } catch (err) {
    console.error(`[ticker lookup error for ${q}]`, err.message);
    return res.status(502).json({ error: 'Yahoo Finance is unavailable. Try again shortly.' });
  }
});

// ── GET /api/ticker/quote ────────────────────────────────────────────────────
// Full quote for a single ticker — used when logging a price update
router.get('/quote', requireAuth, async (req, res) => {
  const ticker = (req.query.t || '').trim().toUpperCase();
  if (!ticker) return res.status(400).json({ error: 'Query parameter "t" (ticker) is required.' });

  const cached = db.getCachedPrice(ticker);
  if (cached) return res.json({ quote: cached, cached: true });

  try {
    const r = await fetchWithTimeout(`${YF_QUOTE}?symbols=${encodeURIComponent(ticker)}`);
    const data = await r.json();
    const quotes = data?.quoteResponse?.result || [];
    if (!quotes.length) return res.status(404).json({ error: `No quote found for "${ticker}".` });

    const quote = normalizeQuote(quotes[0]);
    db.setCachedPrice(ticker, quote);
    return res.json({ quote, cached: false });
  } catch (err) {
    console.error(`[quote error for ${ticker}]`, err.message);
    return res.status(502).json({ error: 'Yahoo Finance is unavailable. Try again shortly.' });
  }
});

// ── GET /api/ticker/batch ────────────────────────────────────────────────────
// Quotes for multiple tickers at once — used by the portfolio refresh button
// e.g. /api/ticker/batch?t=SCHB,SCHF,CHPY
router.get('/batch', requireAuth, async (req, res) => {
  const raw = (req.query.t || '').trim().toUpperCase();
  if (!raw) return res.status(400).json({ error: 'Query parameter "t" with comma-separated tickers is required.' });

  const tickers = [...new Set(raw.split(',').map(t => t.trim()).filter(Boolean))];
  if (tickers.length > 20) return res.status(400).json({ error: 'Maximum 20 tickers per batch request.' });

  const results = {};
  const needFetch = [];

  // Serve cached tickers immediately
  for (const t of tickers) {
    const cached = db.getCachedPrice(t);
    if (cached) results[t] = { ...cached, cached: true };
    else needFetch.push(t);
  }

  // Fetch remaining tickers in one Yahoo Finance call
  if (needFetch.length > 0) {
    try {
      const r = await fetchWithTimeout(
        `${YF_QUOTE}?symbols=${encodeURIComponent(needFetch.join(','))}`
      );
      const data = await r.json();
      const quotes = data?.quoteResponse?.result || [];
      for (const q of quotes) {
        const normalized = normalizeQuote(q);
        db.setCachedPrice(normalized.ticker, normalized);
        results[normalized.ticker] = { ...normalized, cached: false };
      }
      // Mark any not returned by Yahoo as not found
      for (const t of needFetch) {
        if (!results[t]) results[t] = { ticker: t, error: 'Not found' };
      }
    } catch (err) {
      console.error('[batch quote error]', err.message);
      // Don't fail the whole batch — just mark failed tickers
      for (const t of needFetch) {
        if (!results[t]) results[t] = { ticker: t, error: 'Yahoo Finance unavailable' };
      }
    }
  }

  return res.json({ results });
});

module.exports = router;
