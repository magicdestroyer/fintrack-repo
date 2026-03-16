/**
 * server/index.js — FinTrack backend server
 *
 * Express + SQLite backend providing:
 *   - Persistent user authentication (JWT)
 *   - Per-user data storage (budgets, HYSA, stocks, settings)
 *   - Yahoo Finance proxy (ticker lookup, live prices, batch quotes)
 *
 * ── Quick start ──────────────────────────────────────────────────────────────
 *   1. cd server
 *   2. npm install
 *   3. cp .env.example .env   (then edit .env — especially JWT_SECRET)
 *   4. npm start              (or: npm run dev  for auto-reload)
 *
 * The server listens on http://localhost:3001 by default.
 * Open src/dashboard.html in a browser — it will auto-detect the server.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const db         = require('./db');
const authRouter = require('./routes/auth');
const dataRouter = require('./routes/data');
const tickerRouter = require('./routes/ticker');

const app  = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Initialise database schema ───────────────────────────────────────────────
db.initSchema();
console.log(`[db] SQLite ready at ${process.env.DB_PATH || './fintrack.db'}`);

// ── Middleware ───────────────────────────────────────────────────────────────

// CORS — allow the dashboard (file:// or localhost) to call the API
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies (limit 10MB for large portfolio payloads)
app.use(express.json({ limit: '10mb' }));

// Basic request logger in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/data',   dataRouter);
app.use('/api/ticker', tickerRouter);

// ── Health check (used by dashboard to detect if server is running) ──────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  FinTrack Server                         ║
║  Running on http://localhost:${PORT}        ║
║                                          ║
║  Endpoints:                              ║
║    POST /api/auth/signup                 ║
║    POST /api/auth/login                  ║
║    GET  /api/auth/me                     ║
║    GET  /api/data                        ║
║    PUT  /api/data                        ║
║    PUT  /api/data/:key                   ║
║    GET  /api/ticker/lookup?q=TICKER      ║
║    GET  /api/ticker/quote?t=TICKER       ║
║    GET  /api/ticker/batch?t=A,B,C        ║
║    GET  /api/health                      ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app; // exported for testing
