const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Admin dashboard
router.get('/dashboard', authMiddleware, requireRole('admin'), adminController.getAdminDashboard);

// User management
router.get('/users', authMiddleware, requireRole('admin'), adminController.getAllUsers);
router.post('/users', authMiddleware, requireRole('admin'), adminController.createUser);
router.put('/users/:id', authMiddleware, requireRole('admin'), adminController.updateUser);
router.delete('/users/:id', authMiddleware, requireRole('admin'), adminController.deleteUser);

// System management
router.get('/settings', authMiddleware, requireRole('admin'), adminController.getSystemSettings);
router.put('/settings', authMiddleware, requireRole('admin'), adminController.updateSystemSettings);
router.get('/audit-logs', authMiddleware, requireRole('admin'), adminController.getAuditLogs);
router.post('/backup', authMiddleware, requireRole('admin'), adminController.backupDatabase);

module.exports = router;