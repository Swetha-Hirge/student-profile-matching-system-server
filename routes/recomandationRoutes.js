// routes/recommendationRoutes.js
const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

router.get('/', verifyToken, recommendationController.getAllRecommendations);
router.get('/:id', verifyToken, recommendationController.getRecommendationById);
router.post('/', verifyToken, authorizeRole('teacher'), recommendationController.createRecommendation);
router.put('/:id', verifyToken, authorizeRole('teacher'), recommendationController.updateRecommendation);
router.delete('/:id', verifyToken, authorizeRole('teacher'), recommendationController.deleteRecommendation);

module.exports = router;