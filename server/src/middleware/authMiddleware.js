const jwt = require('jsonwebtoken');
const { isUserBanned } = require('../services/moderationService');

// Extracts a bearer token from the Authorization header value.
function extractToken(authorizationHeader = '') {
  const header = authorizationHeader.toString().trim();
  if (!header) return null;

  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null;
  }

  return header;
}

// Parses auth headers and returns both the raw token and decoded user payload.
function parseAuthHeader(authorizationHeader) {
  const token = extractToken(authorizationHeader);
  if (!token) {
    return { token: null, user: null };
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return { token, user };
  } catch (_error) {
    return { token, user: null };
  }
}

// Blocks requests that do not include a valid authenticated user token.
function requireAuth(req, res, next) {
  const { token, user } = parseAuthHeader(req.headers.authorization);

  if (!token || !user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  req.user = user;
  return next();
}

// Optionally attaches authenticated user context when a valid token is present.
function maybeAuth(req, _res, next) {
  const { user } = parseAuthHeader(req.headers.authorization);
  req.user = user || null;
  return next();
}

// Blocks authenticated users whose moderation status is currently banned.
async function requireNotBanned(req, res, next) {
  try {
    const banned = await isUserBanned(req.user.userId);
    if (banned) {
      return res.status(403).json({ error: 'Your account has been banned and cannot perform this action.' });
    }
    return next();
  } catch (_) {
    return next();
  }
}

module.exports = {
  requireAuth,
  maybeAuth,
  requireNotBanned,
  authenticate: requireAuth,
};
