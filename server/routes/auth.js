/**
 * routes/auth.js — Authentication endpoints
 *
 * POST /api/auth/signup  — Create a new account
 * POST /api/auth/login   — Sign in and receive a JWT
 * GET  /api/auth/me      — Verify token and return user info
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ── Validate inputs ──
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }
    const u = username.trim();
    if (u.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    if (u.length > 32) return res.status(400).json({ error: 'Username must be 32 characters or fewer.' });
    if (!/^[a-zA-Z0-9_.-]+$/.test(u)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, underscores, dots, or hyphens.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // ── Check for existing username (case-insensitive) ──
    const existing = db.getUserByUsername(u);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }

    // ── Hash password and create user ──
    const passwordHash = await bcrypt.hash(password, 12); // 12 rounds is the current best-practice balance
    const id = crypto.randomUUID();
    const user = db.createUser(id, u, passwordHash);

    // ── Issue JWT ──
    const token = signToken(user.id);

    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error('[signup error]', err);
    return res.status(500).json({ error: 'Server error during sign-up. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // ── Look up user ──
    const user = db.getUserByUsername(username.trim());
    if (!user) {
      // Deliberate vague error to avoid username enumeration
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // ── Verify password ──
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // ── Update last login time ──
    db.touchLogin(user.id);

    // ── Issue JWT ──
    const token = signToken(user.id);

    return res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error('[login error]', err);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Used by the frontend to verify a stored token is still valid on page load
router.get('/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found.' });
  return res.json({ user: { id: user.id, username: user.username } });
});

module.exports = router;
