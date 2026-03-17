/**
 * routes/auth.js — Authentication endpoints
 *
 * POST /api/auth/signup   — create account
 * POST /api/auth/login    — sign in, receive JWT
 * GET  /api/auth/me       — verify token + get profile
 * PUT  /api/auth/profile  — update DOB, risk, email
 * PUT  /api/auth/password — change password (requires currentPassword)
 * POST /api/auth/logout   — client-side token discard (stateless)
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const db       = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

const VALID_RISKS = ['conservative', 'moderate', 'aggressive', 'speculative'];
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

// ── Helper: safe user payload (never expose password_hash) ───────────────────
function safeUser(u) {
  return {
    id:        u.id,
    username:  u.username,
    email:     u.email     || '',
    dob:       u.dob       || '',
    risk:      u.risk      || 'moderate',
    createdAt: u.created_at,
    lastLogin: u.last_login,
  };
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { username, password, dob = '', risk = 'moderate', email = '' } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const u = username.trim();
    if (u.length < 3 || u.length > 32) {
      return res.status(400).json({ error: 'Username must be 3–32 characters.' });
    }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(u)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, _ . -' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (risk && !VALID_RISKS.includes(risk)) {
      return res.status(400).json({ error: `Invalid risk level. Choose: ${VALID_RISKS.join(', ')}` });
    }
    if (db.getUserByUsername(u)) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
    }
    if (email && db.getUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // ── Create ────────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id           = crypto.randomUUID();
    const user         = db.createUser(id, u, passwordHash, { dob, risk, email });
    const token        = signToken(user.id);

    return res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[signup]', err);
    return res.status(500).json({ error: 'Sign-up failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.getUserByUsername(username.trim());
    if (!user) {
      // Use constant-time comparison to prevent user enumeration
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingreasons00000000000000');
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    db.touchLogin(user.id);
    const token = signToken(user.id);
    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found. Please sign in again.' });
  return res.json({ user: safeUser(user) });
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { dob, risk, email } = req.body;
    if (risk && !VALID_RISKS.includes(risk)) {
      return res.status(400).json({ error: `Invalid risk level. Choose: ${VALID_RISKS.join(', ')}` });
    }
    const user = db.updateProfile(req.userId, { dob, risk, email });
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('[profile]', err);
    return res.status(500).json({ error: 'Profile update failed.' });
  }
});

// ── PUT /api/auth/password ────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.updatePassword(req.userId, newHash);
    return res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[password change]', err);
    return res.status(500).json({ error: 'Password change failed.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// JWT is stateless — logout is handled client-side. This endpoint exists so
// client code can POST to a consistent endpoint and receive a clean response.
router.post('/logout', (_req, res) => {
  res.json({ ok: true, message: 'Signed out successfully.' });
});

module.exports = router;
