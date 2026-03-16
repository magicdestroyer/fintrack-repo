const express = require('express');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const db      = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password, dob = '', risk = 'moderate' } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });
    const u = username.trim();
    if (u.length < 3)  return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    if (u.length > 32) return res.status(400).json({ error: 'Username must be 32 characters or fewer.' });
    if (!/^[a-zA-Z0-9_.-]+$/.test(u))
      return res.status(400).json({ error: 'Username may only contain letters, numbers, _ . -' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (db.getUserByUsername(u))
      return res.status(409).json({ error: 'Username already taken.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const user = db.createUser(id, u, passwordHash, dob, risk);
    const token = signToken(user.id);
    return res.status(201).json({ token, user: { id: user.id, username: user.username, dob: user.dob, risk: user.risk } });
  } catch (err) {
    console.error('[signup]', err);
    return res.status(500).json({ error: 'Server error during sign-up.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });
    const user = db.getUserByUsername(username.trim());
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });
    db.touchLogin(user.id);
    const token = signToken(user.id);
    return res.json({ token, user: { id: user.id, username: user.username, dob: user.dob || '', risk: user.risk || 'moderate' } });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/me  — verify stored token
router.get('/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found.' });
  return res.json({ user: { id: user.id, username: user.username, dob: user.dob || '', risk: user.risk || 'moderate' } });
});

// PUT /api/auth/profile  — update DOB and risk tolerance
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { dob = '', risk = 'moderate' } = req.body;
    const validRisks = ['conservative','moderate','aggressive','speculative'];
    if (risk && !validRisks.includes(risk))
      return res.status(400).json({ error: `Invalid risk value. Must be one of: ${validRisks.join(', ')}` });
    const user = db.updateProfile(req.userId, dob, risk);
    return res.json({ user: { id: user.id, username: user.username, dob: user.dob || '', risk: user.risk || 'moderate' } });
  } catch (err) {
    console.error('[profile update]', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/password  — change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    const user = db.getUserById(req.userId);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    require('better-sqlite3')(process.env.DB_PATH || './fintrack.db')
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[password change]', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
