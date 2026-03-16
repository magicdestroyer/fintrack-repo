/**
 * db.js — FinTrack SQLite database layer
 *
 * Schema:
 *   users       — account credentials (id, username, password_hash)
 *   user_data   — per-user JSON blobs keyed by data_key
 *                 (budgets, hysa, stocks, settings)
 *
 * All writes are synchronous via better-sqlite3 for simplicity.
 * The database file is created automatically on first run.
 */

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'fintrack.db');

// Open (or create) the database file
const db = new Database(DB_PATH, {
  // Enable WAL mode for better concurrent read performance
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
});

// ── Schema migrations ────────────────────────────────────────────────────────

/**
 * Create tables if they don't exist yet.
 * This runs on every server start and is safe to call repeatedly.
 */
function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      dob           TEXT DEFAULT '',
      risk          TEXT DEFAULT 'moderate',
      created_at    INTEGER DEFAULT (strftime('%s','now')),
      last_login    INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS user_data (
      user_id   TEXT NOT NULL,
      data_key  TEXT NOT NULL,
      data_value TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, data_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS price_cache (
      ticker    TEXT PRIMARY KEY,
      data      TEXT NOT NULL,
      cached_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  for (const col of ['dob TEXT DEFAULT ""', 'risk TEXT DEFAULT "moderate"']) {
    try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch(e) { /* already exists */ }
  }
}

// ── User operations ──────────────────────────────────────────────────────────

/**
 * Find a user by username (case-insensitive).
 * @param {string} username
 * @returns {object|null} user row or null
 */
function getUserByUsername(username) {
  return db.prepare(
    'SELECT * FROM users WHERE lower(username) = lower(?)'
  ).get(username) || null;
}

/**
 * Find a user by their ID.
 * @param {string} id
 * @returns {object|null}
 */
function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

/**
 * Create a new user account.
 * @param {string} id         — UUID
 * @param {string} username
 * @param {string} passwordHash — pre-hashed with bcrypt
 * @returns {object} the created user row
 */
function createUser(id, username, passwordHash, dob = '', risk = 'moderate') {
  db.prepare(
    'INSERT INTO users (id, username, password_hash, dob, risk) VALUES (?, lower(?), ?, ?, ?)'
  ).run(id, username, passwordHash, dob || '', risk || 'moderate');
  return getUserById(id);
}

function updateProfile(userId, dob, risk) {
  db.prepare('UPDATE users SET dob = ?, risk = ? WHERE id = ?').run(dob || '', risk || 'moderate', userId);
  return getUserById(userId);
}

/**
 * Update last_login timestamp for a user.
 * @param {string} userId
 */
function touchLogin(userId) {
  db.prepare(
    "UPDATE users SET last_login = strftime('%s','now') WHERE id = ?"
  ).run(userId);
}

// ── User data operations ─────────────────────────────────────────────────────

const VALID_KEYS = new Set(['budgets', 'hysa', 'stocks', 'settings']);

/**
 * Load all data blobs for a user, returned as a plain object.
 * Missing keys default to their empty-state values.
 * @param {string} userId
 * @returns {{ budgets, hysa, stocks, settings }}
 */
function loadUserData(userId) {
  const rows = db.prepare(
    'SELECT data_key, data_value FROM user_data WHERE user_id = ?'
  ).all(userId);

  const defaults = {
    budgets:  '{}',
    hysa:     '[]',
    stocks:   '[]',
    settings: '{"themeIdx":0,"accent":"#3cefb0"}',
  };

  const result = { ...defaults };
  for (const row of rows) {
    if (VALID_KEYS.has(row.data_key)) {
      result[row.data_key] = row.data_value;
    }
  }

  // Parse JSON — return parsed objects, not strings
  const parsed = {};
  for (const [key, val] of Object.entries(result)) {
    try { parsed[key] = JSON.parse(val); }
    catch { parsed[key] = key === 'budgets' ? {} : key === 'settings' ? {} : []; }
  }
  return parsed;
}

/**
 * Save a single data blob for a user (upsert).
 * @param {string} userId
 * @param {string} dataKey  — must be one of VALID_KEYS
 * @param {*}      value    — will be JSON.stringified
 */
function saveUserDataKey(userId, dataKey, value) {
  if (!VALID_KEYS.has(dataKey)) throw new Error(`Invalid data key: ${dataKey}`);
  db.prepare(`
    INSERT INTO user_data (user_id, data_key, data_value, updated_at)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id, data_key)
    DO UPDATE SET data_value = excluded.data_value, updated_at = excluded.updated_at
  `).run(userId, dataKey, JSON.stringify(value));
}

/**
 * Save all four data blobs in a single transaction.
 * @param {string} userId
 * @param {{ budgets?, hysa?, stocks?, settings? }} data
 */
const saveAllData = db.transaction((userId, data) => {
  for (const [key, value] of Object.entries(data)) {
    if (VALID_KEYS.has(key)) {
      saveUserDataKey(userId, key, value);
    }
  }
});

// ── Price cache operations ───────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Retrieve a cached ticker quote if still fresh.
 * @param {string} ticker
 * @returns {object|null} parsed data or null if stale/missing
 */
function getCachedPrice(ticker) {
  const row = db.prepare(
    'SELECT data, cached_at FROM price_cache WHERE ticker = ?'
  ).get(ticker.toUpperCase());
  if (!row) return null;
  const age = Math.floor(Date.now() / 1000) - row.cached_at;
  if (age > CACHE_TTL_SECONDS) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

/**
 * Store a ticker quote in the cache.
 * @param {string} ticker
 * @param {object} data
 */
function setCachedPrice(ticker, data) {
  db.prepare(`
    INSERT INTO price_cache (ticker, data, cached_at)
    VALUES (?, ?, strftime('%s','now'))
    ON CONFLICT(ticker)
    DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at
  `).run(ticker.toUpperCase(), JSON.stringify(data));
}

// ── Export ───────────────────────────────────────────────────────────────────
module.exports = {
  initSchema,
  getUserByUsername,
  getUserById,
  createUser,
  touchLogin,
  loadUserData,
  saveUserDataKey,
  saveAllData,
  getCachedPrice,
  setCachedPrice,
};
