const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware.authenticateToken);

// Student management
router.get('/', authMiddleware.authorize(['admin', 'teacher']), studentController.getAllStudents);
router.get('/:id', authMiddleware.authorize(['admin', 'teacher', 'student']), studentController.getStudentById);
router.post('/', authMiddleware.authorize(['admin']), studentController.createStudent);
router.put('/:id', authMiddleware.authorize(['admin']), studentController.updateStudent);
router.delete('/:id', authMiddleware.authorize(['admin']), studentController.deleteStudent);

module.exports = router;