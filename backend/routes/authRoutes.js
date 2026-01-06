const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail); // Changed to POST with code
router.post('/resend-verification', authController.resendVerificationCode);

// Protected routes
router.get('/profile', authMiddleware.authenticateToken, authController.getProfile);
router.put('/profile', authMiddleware.authenticateToken, authController.updateProfile);
router.post('/logout', authMiddleware.authenticateToken, authController.logout);

module.exports = router;