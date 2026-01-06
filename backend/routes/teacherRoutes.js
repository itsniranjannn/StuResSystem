const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.authenticateToken);

// Teacher management
router.get('/', authMiddleware.authorize(['admin']), teacherController.getAllTeachers);
router.get('/:id', authMiddleware.authorize(['admin', 'teacher']), teacherController.getTeacherById);
router.post('/', authMiddleware.authorize(['admin']), teacherController.createTeacher);
router.put('/:id', authMiddleware.authorize(['admin']), teacherController.updateTeacher);
router.delete('/:id', authMiddleware.authorize(['admin']), teacherController.deleteTeacher);

module.exports = router;