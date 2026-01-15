// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/profile', authMiddleware.authenticateToken, authController.getProfile);
router.put('/profile', authMiddleware.authenticateToken, authController.updateProfile);
router.post('/verify-email', authMiddleware.authenticateToken, authController.verifyEmail); // For profile page
router.post('/change-password', authMiddleware.authenticateToken, authController.changePassword);
router.post('/logout', authMiddleware.authenticateToken, authController.logout);

module.exports = router;