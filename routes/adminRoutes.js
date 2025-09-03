const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRole } = require('../middleware/auth');

router.get('/users', verifyToken, authorizeRole('admin'), adminController.getAllUsers);

module.exports = router;
