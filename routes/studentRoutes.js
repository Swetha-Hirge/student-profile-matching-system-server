// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

let cacheMiddleware = (_pfx, _ttl) => (req, res, next) => next();
try { ({ cacheMiddleware } = require('../middleware/cache')); } catch (_) {}

/* ---------- /me (must be BEFORE :id) ---------- */

// Logged-in student's profile (Student row)
router.get(
  '/me',
  verifyToken,
  authorizeRole('student'),
  studentController.getMe
);

// Logged-in student's saved recommendations (optional)
router.get(
  '/me/recommendations',
  verifyToken,
  authorizeRole('student'),
  studentController.getMySavedRecommendationsMinimal
);

/* ---------- List / read ---------- */

router.get(
  '/',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  cacheMiddleware('students', 60),
  studentController.getAllStudents
);

router.get(
  '/:id',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  cacheMiddleware('student', 60),
  studentController.getStudentById
);

/* ---------- Recommendations ---------- */

// Anyone may *read* with restrictions inside controller:
// - student: only their own id
// - teacher: only their students
// - admin: any
router.get(
  '/:id/recommendations',
  verifyToken,
  authorizeRole(['teacher', 'student', 'admin']),
  studentController.getRecommendationsForStudent
);

// Only teacher/admin can create/save a top recommendation
router.post(
  '/:id/recommendations',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  studentController.generateAndSaveTopRecommendation
);

/* ---------- Update / delete ---------- */

router.put(
  '/:id',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  studentController.updateStudent
);

router.delete(
  '/:id',
  verifyToken,
  authorizeRole(['teacher', 'admin']),
  studentController.deleteStudent
);

module.exports = router;
