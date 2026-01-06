const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.authenticateToken);

// Results routes
router.get('/', authMiddleware.authorize(['admin', 'teacher']), resultController.getAllResults);
router.get('/student/:id?', resultController.getResultByStudent);
router.get('/rankings', authMiddleware.authorize(['admin', 'teacher', 'student']), resultController.getResultRankings);
router.post('/calculate', authMiddleware.authorize(['admin']), resultController.calculateResults);
router.post('/publish', authMiddleware.authorize(['admin']), resultController.publishResults);

module.exports = router;