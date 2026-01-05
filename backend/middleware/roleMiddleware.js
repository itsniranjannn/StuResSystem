/**
 * Role-based access control middleware
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

/**
 * Student-specific middleware
 */
const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Student access only.' 
    });
  }
  
  // Add student ID to request if not present
  if (!req.user.studentId) {
    // Fetch student ID from database
    const db = require('../config/database');
    db.query('SELECT id FROM students WHERE user_id = ?', [req.user.id])
      .then(([results]) => {
        if (results.length > 0) {
          req.user.studentId = results[0].id;
          next();
        } else {
          res.status(404).json({ 
            success: false, 
            message: 'Student record not found' 
          });
        }
      })
      .catch(error => {
        res.status(500).json({ 
          success: false, 
          message: 'Error fetching student data' 
        });
      });
  } else {
    next();
  }
};

/**
 * Teacher-specific middleware
 */
const teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Teacher access only.' 
    });
  }
  next();
};

/**
 * Admin-only middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin access only.' 
    });
  }
  next();
};

module.exports = {
  authorize,
  studentOnly,
  teacherOnly,
  adminOnly
};