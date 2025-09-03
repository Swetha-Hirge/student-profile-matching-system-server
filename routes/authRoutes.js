// routes/authRoutes.js
const router = require('express').Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);     // ✅ add this
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
