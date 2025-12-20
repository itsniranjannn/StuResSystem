const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Teacher dashboard
router.get('/dashboard', authMiddleware, requireRole('teacher'), teacherController.getTeacherDashboard);

// Teacher profile and subjects
router.get('/', authMiddleware, requireRole('admin'), teacherController.getAllTeachers);
router.get('/:id', authMiddleware, requireRole('admin', 'teacher'), teacherController.getTeacherById);

// Subject management
router.get('/subjects/:subjectId/students', authMiddleware, requireRole('teacher'), teacherController.getSubjectStudents);
router.post('/subjects/:subjectId/marks/bulk', authMiddleware, requireRole('teacher'), teacherController.bulkUpdateMarks);

module.exports = router;