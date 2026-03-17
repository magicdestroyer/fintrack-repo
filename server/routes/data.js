/**
 * routes/data.js — User data persistence (budgets, HYSA, stocks, settings)
 *
 * All routes require JWT authentication.
 *
 * GET  /api/data        — load all four data blobs
 * PUT  /api/data        — save all four data blobs in one request
 * PUT  /api/data/:key   — save a single key (auto-save on change)
 * GET  /api/data/export — full JSON export (for user download)
 * POST /api/data/import — restore from JSON export
 */

const express    = require('express');
const db         = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_KEYS = [...db.VALID_KEYS];

// ── GET /api/data ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const data = db.loadUserData(req.userId);
    return res.json({ data });
  } catch (err) {
    console.error('[data GET]', err);
    return res.status(500).json({ error: 'Failed to load data.' });
  }
});

// ── PUT /api/data ─────────────────────────────────────────────────────────────
router.put('/', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    const filtered = {};
    for (const k of VALID_KEYS) {
      if (k in payload) filtered[k] = payload[k];
    }
    if (!Object.keys(filtered).length) {
      return res.status(400).json({ error: `No valid keys. Valid: ${VALID_KEYS.join(', ')}` });
    }
    db.saveAllData(req.userId, filtered);
    return res.json({ ok: true, saved: Object.keys(filtered) });
  } catch (err) {
    console.error('[data PUT]', err);
    return res.status(500).json({ error: 'Failed to save data.' });
  }
});

// ── PUT /api/data/:key ────────────────────────────────────────────────────────
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params;
    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({ error: `Invalid key "${key}". Valid: ${VALID_KEYS.join(', ')}` });
    }
    if (req.body === undefined || req.body === null) {
      return res.status(400).json({ error: 'Request body is required.' });
    }
    db.saveUserDataKey(req.userId, key, req.body);
    return res.json({ ok: true, key });
  } catch (err) {
    console.error(`[data PUT /${req.params.key}]`, err);
    return res.status(500).json({ error: 'Failed to save data.' });
  }
});

// ── GET /api/data/export ──────────────────────────────────────────────────────
// Returns full user data as a downloadable JSON blob
router.get('/export', (req, res) => {
  try {
    const data    = db.loadUserData(req.userId);
    const user    = require('../db').getUserById(req.userId);
    const payload = {
      exportVersion: '2.0.0',
      exportDate:    new Date().toISOString(),
      username:      user?.username || 'unknown',
      ...data,
    };
    res.setHeader('Content-Disposition', `attachment; filename="fintrack_export_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(payload);
  } catch (err) {
    console.error('[data export]', err);
    return res.status(500).json({ error: 'Export failed.' });
  }
});

// ── POST /api/data/import ─────────────────────────────────────────────────────
// Restores from a previously exported JSON file
router.post('/import', (req, res) => {
  try {
    const { budgets, hysa, stocks, settings } = req.body;
    const toSave = {};
    if (budgets  !== undefined) toSave.budgets  = budgets;
    if (hysa     !== undefined) toSave.hysa     = hysa;
    if (stocks   !== undefined) toSave.stocks   = stocks;
    if (settings !== undefined) toSave.settings = settings;

    if (!Object.keys(toSave).length) {
      return res.status(400).json({ error: 'No valid data keys found in import payload.' });
    }
    db.saveAllData(req.userId, toSave);
    return res.json({ ok: true, imported: Object.keys(toSave) });
  } catch (err) {
    console.error('[data import]', err);
    return res.status(500).json({ error: 'Import failed.' });
  }
});

module.exports = router;
