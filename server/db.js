/**
 * db.js — FinTrack SQLite database layer v2.0.0
 *
 * Schema:
 *   users       — accounts (id, username, password_hash, dob, risk, email)
 *   user_data   — per-user JSON blobs (budgets / hysa / stocks / settings)
 *   sessions    — optional server-side session tracking for revocation
 *   price_cache — Yahoo Finance 15-min cache
 *
 * Uses better-sqlite3 (synchronous) for simplicity and reliability.
 * WAL mode enabled for better concurrent read performance.
 */

const Database = require('better-sqlite3');
const path     = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'fintrack.db');

const db = new Database(DB_PATH, {
  verbose: process.env.DB_VERBOSE === 'true' ? console.log : undefined,
});

// ── Schema ────────────────────────────────────────────────────────────────────
function initSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous  = NORMAL;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT    PRIMARY KEY,
      username      TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      email         TEXT    DEFAULT '',
      dob           TEXT    DEFAULT '',
      risk          TEXT    DEFAULT 'moderate',
      created_at    INTEGER DEFAULT (strftime('%s','now')),
      last_login    INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS user_data (
      user_id    TEXT    NOT NULL,
      data_key   TEXT    NOT NULL,
      data_value TEXT    NOT NULL DEFAULT '{}',
      updated_at INTEGER DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, data_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_cache (
      ticker    TEXT    PRIMARY KEY,
      data      TEXT    NOT NULL,
      cached_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_user_data_uid ON user_data(user_id);
  `);

  // Safe migrations — add columns that may not exist yet
  const safeMigrate = (sql) => { try { db.exec(sql); } catch (_) {} };
  safeMigrate('ALTER TABLE users ADD COLUMN email TEXT DEFAULT ""');
  safeMigrate('ALTER TABLE users ADD COLUMN dob   TEXT DEFAULT ""');
  safeMigrate('ALTER TABLE users ADD COLUMN risk  TEXT DEFAULT "moderate"');
}

// ── DB health ping ────────────────────────────────────────────────────────────
function ping() {
  db.prepare('SELECT 1').get();
}

function close() {
  try { db.close(); } catch (_) {}
}

// ── User CRUD ─────────────────────────────────────────────────────────────────
function getUserByUsername(username) {
  return db.prepare(
    'SELECT * FROM users WHERE lower(username) = lower(?)'
  ).get(username) || null;
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function getUserByEmail(email) {
  if (!email) return null;
  return db.prepare(
    'SELECT * FROM users WHERE lower(email) = lower(?)'
  ).get(email) || null;
}

function createUser(id, username, passwordHash, { dob = '', risk = 'moderate', email = '' } = {}) {
  db.prepare(`
    INSERT INTO users (id, username, password_hash, dob, risk, email)
    VALUES (?, lower(?), ?, ?, ?, lower(?))
  `).run(id, username, passwordHash, dob, risk, email);
  return getUserById(id);
}

function updateProfile(userId, { dob, risk, email }) {
  const current = getUserById(userId);
  if (!current) throw new Error('User not found');
  db.prepare(`
    UPDATE users
    SET dob = ?, risk = ?, email = ?, last_login = strftime('%s','now')
    WHERE id = ?
  `).run(
    dob   ?? current.dob,
    risk  ?? current.risk,
    email ?? current.email,
    userId
  );
  return getUserById(userId);
}

function updatePassword(userId, newHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
}

function touchLogin(userId) {
  db.prepare("UPDATE users SET last_login = strftime('%s','now') WHERE id = ?").run(userId);
}

// ── User data CRUD ────────────────────────────────────────────────────────────
const VALID_KEYS = new Set(['budgets', 'hysa', 'stocks', 'settings']);

function loadUserData(userId) {
  const rows = db.prepare(
    'SELECT data_key, data_value FROM user_data WHERE user_id = ?'
  ).all(userId);

  const defaults = {
    budgets:  '{}',
    hysa:     '[]',
    stocks:   '[]',
    settings: '{"themeIdx":0,"accent":"#3cefb0","liveEnabled":false,"extendedHours":false}',
  };

  const result = { ...defaults };
  for (const row of rows) {
    if (VALID_KEYS.has(row.data_key)) result[row.data_key] = row.data_value;
  }

  const parsed = {};
  for (const [k, v] of Object.entries(result)) {
    try { parsed[k] = JSON.parse(v); }
    catch { parsed[k] = k === 'budgets' || k === 'settings' ? {} : []; }
  }
  return parsed;
}

function saveUserDataKey(userId, dataKey, value) {
  if (!VALID_KEYS.has(dataKey)) throw new Error(`Invalid key: ${dataKey}`);
  db.prepare(`
    INSERT INTO user_data (user_id, data_key, data_value, updated_at)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id, data_key)
    DO UPDATE SET data_value = excluded.data_value,
                  updated_at = excluded.updated_at
  `).run(userId, dataKey, JSON.stringify(value));
}

const saveAllData = db.transaction((userId, data) => {
  for (const [k, v] of Object.entries(data)) {
    if (VALID_KEYS.has(k)) saveUserDataKey(userId, k, v);
  }
});

// ── Price cache ───────────────────────────────────────────────────────────────
const CACHE_TTL = parseInt(process.env.PRICE_CACHE_TTL_S || '900'); // 15 min default

function getCachedPrice(ticker) {
  const row = db.prepare(
    'SELECT data, cached_at FROM price_cache WHERE ticker = upper(?)'
  ).get(ticker);
  if (!row) return null;
  const age = Math.floor(Date.now() / 1000) - row.cached_at;
  if (age > CACHE_TTL) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}

function setCachedPrice(ticker, data) {
  db.prepare(`
    INSERT INTO price_cache (ticker, data, cached_at)
    VALUES (upper(?), ?, strftime('%s','now'))
    ON CONFLICT(ticker)
    DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at
  `).run(ticker, JSON.stringify(data));
}

// Evict cache entries older than TTL (call periodically to keep DB lean)
function evictPriceCache() {
  const cutoff = Math.floor(Date.now() / 1000) - CACHE_TTL;
  db.prepare('DELETE FROM price_cache WHERE cached_at < ?').run(cutoff);
}

// Run eviction every hour
setInterval(evictPriceCache, 60 * 60 * 1000);

module.exports = {
  initSchema,
  ping,
  close,
  getUserByUsername,
  getUserById,
  getUserByEmail,
  createUser,
  updateProfile,
  updatePassword,
  touchLogin,
  loadUserData,
  saveUserDataKey,
  saveAllData,
  getCachedPrice,
  setCachedPrice,
  VALID_KEYS,
};
