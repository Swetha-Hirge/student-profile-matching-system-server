// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

// Accept httpOnly cookie "token" OR Authorization: Bearer <token>
exports.verifyToken = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  const cookieToken = req.cookies?.token || null;
  const token = bearer || cookieToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized: no token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, email? }
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};

// Role guard – pass a single role or an array
exports.authorizeRole = (required) => (req, res, next) => {
  const allowed = Array.isArray(required) ? required : [required];
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (allowed.length && !allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
};