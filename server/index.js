/**
 * FinTrack Server — v2.0.0
 * Production-ready Express + SQLite backend
 *
 * Features:
 *   - JWT authentication with 30-day sessions
 *   - Per-user data stored in SQLite (cross-device sync)
 *   - Yahoo Finance proxy with 15-minute cache
 *   - Rate limiting, CORS, security headers
 *   - Graceful shutdown, health/readiness endpoints
 *
 * Quick start:
 *   cp .env.example .env  → set JWT_SECRET
 *   npm install && npm start
 *   Open http://localhost:3001
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const db           = require('./db');
const authRouter   = require('./routes/auth');
const dataRouter   = require('./routes/data');
const tickerRouter = require('./routes/ticker');

const app  = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const ENV  = process.env.NODE_ENV || 'development';

// ── Initialise database ───────────────────────────────────────────────────────
db.initSchema();
console.log(`[db] SQLite ready → ${process.env.DB_PATH || './fintrack.db'}`);

// ── Security middleware ───────────────────────────────────────────────────────
// Helmet sets safe HTTP headers; relax CSP just enough for CDN fonts & charts
app.use(helmet({
  contentSecurityPolicy: false,//: {
    //directives: {
     // defaultSrc:  ["'self'"],
    //  scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdnjs.cloudflare.com'],
    //  scriptSrcAttr: ["'unsafe-inline'"],
    //  styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
    //  fontSrc:     ["'self'", 'fonts.gstatic.com', 'fonts.googleapis.com'],
    //  imgSrc:      ["'self'", 'data:', 'blob:'],
    //  connectSrc:  ["'self'", 'query1.finance.yahoo.com', 'api.anthropic.com', 'api.allorigins.win', 'fonts.googleapis.com', 'fonts.gstatic.com'],
   // },
  //},
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no Origin header), file:// (origin 'null'), and allowed origins
    if (!origin || origin === 'null' || ALLOWED_ORIGINS.includes(origin) || ENV === 'development') {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API: 200 req / 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down and try again.' },
}));

// Auth routes: 20 req / 15 min (brute-force protection)
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts — please try again in 15 minutes.' },
}));

// ── Request logger (dev only) ────────────────────────────────────────────────
if (ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/data',   dataRouter);
app.use('/api/ticker', tickerRouter);

// ── Health / Readiness ───────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', env: ENV, ts: new Date().toISOString() });
});

app.get('/api/ready', (_req, res) => {
  try {
    // Simple DB ping
    db.ping();
    res.json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});

// ── Serve frontend ───────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR, {
  maxAge: ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// SPA fallback — any non-API, non-file route serves index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // CORS errors
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  FinTrack v2.0.0  (${ENV.padEnd(12)})        ║
║  http://localhost:${PORT}                   ║
╚══════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed.');
    db.close();
    process.exit(0);
  });
  // Force exit after 10 s if graceful shutdown stalls
  setTimeout(() => process.exit(1), 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
