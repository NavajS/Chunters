const pool = require('../config/db');

async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    return next();
  } catch (_) {
    return res.status(500).json({ error: 'Failed to verify admin access.' });
  }
}

async function requireModeratorOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    const role = result.rows[0]?.role;
    if (!role || (role !== 'admin' && role !== 'moderator')) {
      return res.status(403).json({ error: 'Moderator or admin access required.' });
    }

    return next();
  } catch (_) {
    return res.status(500).json({ error: 'Failed to verify access.' });
  }
}

module.exports = { requireAdmin, requireModeratorOrAdmin };
