 const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

router.get('/', verifyToken, authorizeRole(['admin', 'teacher']), feedbackController.getAllFeedback);
router.post('/', verifyToken, authorizeRole('student'), feedbackController.createFeedback);

module.exports = router;