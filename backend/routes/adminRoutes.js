const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.authenticateToken);

// Admin only routes
router.get('/dashboard', authMiddleware.authorize(['admin']), adminController.getDashboardStats);
router.get('/users', authMiddleware.authorize(['admin']), adminController.getAllUsers);
router.put('/users/:id/status', authMiddleware.authorize(['admin']), adminController.updateUserStatus);
router.delete('/users/:id', authMiddleware.authorize(['admin']), adminController.deleteUser);
router.post('/create-admin', authMiddleware.authorize(['admin']), adminController.createAdmin);

module.exports = router;