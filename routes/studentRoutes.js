// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

let cacheMiddleware = (_pfx, _ttl) => (req, res, next) => next(); // no-op fallback
try {
  // use the correct path if your file is named cacheMiddleware.js
  ({ cacheMiddleware } = require('../middleware/cache'));
} catch (_) { /* keep no-op */ }

// List & get
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

// Update / delete (teacher can only touch their own students; admin can touch all)
router.put('/:id', verifyToken, authorizeRole(['teacher', 'admin']), studentController.updateStudent);
router.delete('/:id', verifyToken, authorizeRole(['teacher', 'admin']), studentController.deleteStudent);

// Recommendations
router.get('/:id/recommendations', verifyToken, authorizeRole(['teacher', 'student', 'admin']), studentController.getRecommendationsForStudent);
router.post('/:id/recommendations', verifyToken, authorizeRole(['teacher', 'admin']), studentController.generateAndSaveTopRecommendation);

module.exports = router;
