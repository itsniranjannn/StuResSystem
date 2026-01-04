const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Mock student controller for now
const studentController = {
  getAllStudents: async (req, res) => {
    try {
      // This will be implemented later
      res.json({
        success: true,
        message: 'Students fetched successfully',
        data: [
          { id: 1, name: 'John Doe', rollNo: 'BCA24001', semester: 6, gpa: 3.8 },
          { id: 2, name: 'Jane Smith', rollNo: 'BCA24002', semester: 6, gpa: 3.6 },
          { id: 3, name: 'Bob Johnson', rollNo: 'BCA24003', semester: 6, gpa: 3.9 },
        ]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// Protected routes
router.get('/', authMiddleware.verifyToken, studentController.getAllStudents);

module.exports = router;