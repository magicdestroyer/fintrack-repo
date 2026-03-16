/**
 * routes/data.js — User data persistence endpoints
 *
 * All routes require a valid JWT (via requireAuth middleware).
 *
 * GET  /api/data           — Load all user data (budgets, hysa, stocks, settings)
 * PUT  /api/data           — Save all user data in one request
 * PUT  /api/data/:key      — Save a single data key
 */

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All data routes require authentication
router.use(requireAuth);

// Valid data keys — must match db.js VALID_KEYS
const VALID_KEYS = ['budgets', 'hysa', 'stocks', 'settings'];

// ── GET /api/data ────────────────────────────────────────────────────────────
// Returns the full user data payload — called once on login/page load
router.get('/', (req, res) => {
  try {
    const data = db.loadUserData(req.userId);
    return res.json({ data });
  } catch (err) {
    console.error('[data GET error]', err);
    return res.status(500).json({ error: 'Failed to load user data.' });
  }
});

// ── PUT /api/data ────────────────────────────────────────────────────────────
// Save all data in one request (full sync on app close / save button)
router.put('/', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    // Filter to only valid keys to prevent arbitrary data storage
    const filtered = {};
    for (const key of VALID_KEYS) {
      if (key in payload) filtered[key] = payload[key];
    }

    if (Object.keys(filtered).length === 0) {
      return res.status(400).json({ error: `No valid keys in payload. Valid keys: ${VALID_KEYS.join(', ')}` });
    }

    db.saveAllData(req.userId, filtered);
    return res.json({ ok: true, saved: Object.keys(filtered) });
  } catch (err) {
    console.error('[data PUT error]', err);
    return res.status(500).json({ error: 'Failed to save user data.' });
  }
});

// ── PUT /api/data/:key ───────────────────────────────────────────────────────
// Save a single key — called after each individual change (auto-save)
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: `Invalid key "${key}". Valid keys: ${VALID_KEYS.join(', ')}` });
    }

    const value = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Request body is required.' });
    }

    db.saveUserDataKey(req.userId, key, value);
    return res.json({ ok: true, key });
  } catch (err) {
    console.error(`[data PUT /${req.params.key} error]`, err);
    return res.status(500).json({ error: 'Failed to save data.' });
  }
});

module.exports = router;
