function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  return next();
}

function requireModeratorOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Moderator or admin access required.' });
  }

  return next();
}

module.exports = { requireAdmin, requireModeratorOrAdmin };