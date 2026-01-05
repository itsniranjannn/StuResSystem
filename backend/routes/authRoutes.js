const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware.verifyToken, authController.getProfile);
router.put('/profile', authMiddleware.verifyToken, authController.updateProfile);
router.put('/change-password', authMiddleware.verifyToken, authController.changePassword);
router.post('/logout', authMiddleware.verifyToken, authController.logout);

// Test route (for development only)
router.post('/test-hash', authController.testHash);

module.exports = router;