/**
 * middleware/auth.js — JWT authentication middleware
 *
 * Attaches req.userId to authenticated requests.
 * Returns 401 if the token is missing, expired, or invalid.
 *
 * Usage:
 *   const { requireAuth } = require('./middleware/auth');
 *   router.get('/protected', requireAuth, handler);
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-in-production';

/**
 * Extract and verify the Bearer token from the Authorization header.
 * On success, sets req.userId and calls next().
 * On failure, returns a 401 JSON error.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required — no token provided.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expired — please sign in again.'
      : 'Invalid authentication token.';
    return res.status(401).json({ error: message });
  }
}

/**
 * Issue a signed JWT for a given user.
 * @param {string} userId
 * @returns {string} signed JWT string
 */
function signToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

module.exports = { requireAuth, signToken };
