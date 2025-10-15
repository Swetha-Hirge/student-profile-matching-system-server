// server/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRole } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

router.post(
  '/:id/feedback',
  verifyToken,
  authorizeRole('student'),
  feedbackController.createFeedback
);

// Student creates/updates their own feedback for a recommendation
router.post(
  '/recommendations/:id/feedback',
  verifyToken,
  authorizeRole('student'),
  feedbackController.createOrUpdateMine
);

// Get feedback on a recommendation
//  - student: only their own feedback record (if exists)
//  - teacher/admin: all feedback for that recommendation (paginated)
router.get(
  '/recommendations/:id/feedback',
  verifyToken,
  authorizeRole(['student', 'teacher', 'admin']),
  feedbackController.getForRecommendation
);

// Aggregate (teacher/admin): satisfaction summary for an activity
router.get(
  '/activities/:activityId/feedback/summary',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  feedbackController.activitySummary
);

module.exports = router;
