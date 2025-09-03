const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

// Safe cache fallback (in case middleware file name differs)
let cacheMiddleware = (_pfx, _ttl) => (req, res, next) => next();
try {
  ({ cacheMiddleware } = require('../middleware/cacheMiddleware')); // adjust path if needed
} catch (_) {}

router.get(
  '/',
  verifyToken,
  cacheMiddleware('activities', 60),
  activityController.getAllActivities
);

router.get(
  '/:id',
  verifyToken,
  cacheMiddleware('activity', 60),
  activityController.getActivityById
);

router.post(
  '/',
  verifyToken,
  authorizeRole(['admin', 'teacher']),
  activityController.createActivity
);

module.exports = router;
