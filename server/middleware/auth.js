/**
 * middleware/auth.js — JWT authentication middleware
 *
 * requireAuth:  attaches req.userId; returns 401 on failure
 * optionalAuth: attaches req.userId if token present; never rejects
 * signToken:    issues a signed JWT for a given userId
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '30d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    '[auth] FATAL: JWT_SECRET is missing or too short (min 32 chars). ' +
    'Set it in your .env file before starting the server.'
  );
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

/**
 * Verify the Bearer token from the Authorization header.
 * On success: sets req.userId and calls next().
 * On failure: returns a 401 JSON error.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please sign in again.'
      : 'Invalid authentication token. Please sign in again.';
    return res.status(401).json({ error: msg });
  }
}

/**
 * Attach userId if a valid token is present, but never block the request.
 */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload.userId;
    } catch (_) {
      // Silently ignore invalid / expired tokens
    }
  }
  next();
}

/**
 * Issue a signed JWT for a given user.
 * @param {string} userId
 * @returns {string}
 */
function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

module.exports = { requireAuth, optionalAuth, signToken };
