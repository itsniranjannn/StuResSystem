const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Please sign in to continue' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await query('SELECT id, name, email, role, is_active FROM users WHERE id = ?', [payload.id]);
    if (!user || !user.is_active) return res.status(401).json({ success: false, message: 'Account is disabled or removed' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expired, please sign in again' });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ success: false, message: 'You do not have permission for this action' });

// Wraps async handlers so thrown errors reach the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { authenticate, requireRole, wrap };
