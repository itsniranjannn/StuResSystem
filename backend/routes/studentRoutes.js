const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Public routes (none)

// Protected routes - Admin and Teacher access
router.get('/', authMiddleware, requireRole('admin', 'teacher'), studentController.getAllStudents);
router.get('/:id', authMiddleware, requireRole('admin', 'teacher'), studentController.getStudentById);
router.post('/', authMiddleware, requireRole('admin'), studentController.createStudent);
router.put('/:id', authMiddleware, requireRole('admin'), studentController.updateStudent);
router.delete('/:id', authMiddleware, requireRole('admin'), studentController.deleteStudent);

// Marks routes
router.get('/:studentId/marks', authMiddleware, requireRole('admin', 'teacher'), studentController.getStudentMarks);
router.post('/:studentId/marks', authMiddleware, requireRole('admin', 'teacher'), studentController.addMarks);
router.put('/marks/:marksId', authMiddleware, requireRole('admin', 'teacher'), studentController.updateMarks);

module.exports = router;