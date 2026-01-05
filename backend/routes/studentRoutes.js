const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Apply authentication and authorization middleware
router.use(authMiddleware.authenticateToken);
router.use(roleMiddleware.studentOnly);

// Dashboard
router.get('/dashboard', studentController.getDashboardStats);

// Results
router.get('/results', studentController.getStudentResults);

// Profile
router.get('/profile', (req, res) => {
  // Get student profile
  res.json({ message: 'Get profile endpoint' });
});

router.put('/profile', (req, res) => {
  // Update student profile
  res.json({ message: 'Update profile endpoint' });
});

// Attendance
router.get('/attendance', (req, res) => {
  // Get attendance
  res.json({ message: 'Get attendance endpoint' });
});

module.exports = router;