const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Apply authentication and authorization middleware
router.use(authMiddleware.authenticateToken);
router.use(roleMiddleware.teacherOnly);

// Dashboard
router.get('/dashboard', teacherController.getDashboardStats);

// Student management
router.get('/students', teacherController.getTeacherStudents);

// Marks management
router.post('/marks', teacherController.enterMarks);
router.get('/marks', (req, res) => {
  // Get marks entered by teacher
  res.json({ message: 'Get marks endpoint' });
});

// Attendance
router.post('/attendance', (req, res) => {
  // Mark attendance
  res.json({ message: 'Mark attendance endpoint' });
});

module.exports = router;