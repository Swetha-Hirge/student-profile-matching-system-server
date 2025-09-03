// routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, authorizeRole } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache'); // ✅ fixed

// Admin-only actions
router.post('/', verifyToken, authorizeRole('admin'), teacherController.createTeacher);
router.put('/:id', verifyToken, authorizeRole('admin'), teacherController.updateTeacher);
router.delete('/:id', verifyToken, authorizeRole('admin'), teacherController.deleteTeacher);

// Public-ish (any authenticated user)
router.get('/', verifyToken, cacheMiddleware('teachers', 60), teacherController.getAllTeachers);

// IMPORTANT: keep any literal paths BEFORE param routes to avoid future clashes
router.post('/students', verifyToken, authorizeRole('teacher'), teacherController.createStudentUnderLoggedInTeacher);

// Finally, param route
router.get('/:id', verifyToken, cacheMiddleware('teacher', 60), teacherController.getTeacherById);

module.exports = router;
