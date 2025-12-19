const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Public routes for published results (with authentication)
router.get('/', authMiddleware, resultController.getAllResults);
router.get('/stats', authMiddleware, resultController.getResultStats);
router.get('/:id', authMiddleware, resultController.getResultById);
router.get('/:resultId/pdf', authMiddleware, resultController.generateResultPDF);

// Admin-only routes
router.post('/publish', authMiddleware, requireRole('admin'), resultController.publishResults);

module.exports = router;