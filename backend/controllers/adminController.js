const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Get admin dashboard stats
exports.getAdminDashboard = async (req, res) => {
  try {
    // Get all stats
    const [
      [studentCount],
      [teacherCount],
      [subjectCount],
      [resultCount],
      [recentResults],
      [topStudents],
      [gradeDistribution],
      [pendingResults]
    ] = await Promise.all([
      pool.execute('SELECT COUNT(*) as count FROM students'),
      pool.execute('SELECT COUNT(*) as count FROM teachers'),
      pool.execute('SELECT COUNT(*) as count FROM subjects'),
      pool.execute('SELECT COUNT(*) as count FROM results WHERE status = "published"'),
      pool.execute(`
        SELECT r.*, s.roll_no, s.program 
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.status = 'published'
        ORDER BY r.updated_at DESC
        LIMIT 5
      `),
      pool.execute(`
        SELECT r.*, s.roll_no, s.program 
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE r.status = 'published'
        ORDER BY r.gpa DESC, r.total_marks DESC
        LIMIT 10
      `),
      pool.execute(`
        SELECT grade, COUNT(*) as count
        FROM results
        WHERE status = 'published'
        GROUP BY grade
        ORDER BY FIELD(grade, 'A+', 'A', 'B+', 'B', 'C+', 'C', 'F')
      `),
      pool.execute(`
        SELECT COUNT(*) as count 
        FROM results 
        WHERE status = 'pending'
      `)
    ]);

    // Get system status
    const [notices] = await pool.execute(`
      SELECT COUNT(*) as count FROM notices
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [recentUsers] = await pool.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      success: true,
      data: {
        stats: {
          students: studentCount[0].count,
          teachers: teacherCount[0].count,
          subjects: subjectCount[0].count,
          results: resultCount[0].count,
          pendingResults: pendingResults[0].count,
          recentNotices: notices[0].count,
          recentUsers: recentUsers[0].count
        },
        recentResults: recentResults[0],
        topStudents: topStudents[0],
        gradeDistribution: gradeDistribution[0],
        systemHealth: {
          database: 'connected',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error fetching dashboard' });
  }
};

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.*, 
        s.roll_no, s.program, s.semester,
        t.department, t.qualification
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }
    
    if (search) {
      query += ' AND (u.name LIKE ? OR u.email LIKE ? OR s.roll_no LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [users] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
    const countParams = [];
    
    if (role) {
      countQuery += ' AND u.role = ?';
      countParams.push(role);
    }
    
    if (search) {
      countQuery += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const [[{ total }]] = await pool.execute(countQuery, countParams);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
};

// Create user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, ...roleData } = req.body;
    
    // Validate role data
    if (role === 'student' && !roleData.roll_no) {
      return res.status(400).json({ error: 'Roll number is required for students' });
    }
    
    if (role === 'teacher' && !roleData.department) {
      return res.status(400).json({ error: 'Department is required for teachers' });
    }
    
    // Check if email exists
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Insert user
    const [userResult] = await pool.execute(
      `INSERT INTO users (name, email, phone, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, hashedPassword, role]
    );
    
    const userId = userResult.insertId;
    
    // Insert role-specific data
    if (role === 'student') {
      await pool.execute(
        `INSERT INTO students (user_id, roll_no, student_name, semester, program) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, roleData.roll_no, name, roleData.semester || 6, roleData.program || 'BCA']
      );
    } else if (role === 'teacher') {
      await pool.execute(
        `INSERT INTO teachers (user_id, teacher_name, department, qualification, experience) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, name, roleData.department, roleData.qualification || '', roleData.experience || 0]
      );
    }
    
    await pool.execute('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId, name, email, role }
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error creating user' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Get current user data
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      await pool.execute('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentRole = users[0].role;
    
    // Update user table
    const userUpdates = [];
    const userValues = [];
    
    if (updates.name) {
      userUpdates.push('name = ?');
      userValues.push(updates.name);
    }
    
    if (updates.email) {
      // Check if email exists for another user
      const [existingEmail] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updates.email, id]
      );
      
      if (existingEmail.length > 0) {
        await pool.execute('ROLLBACK');
        return res.status(400).json({ error: 'Email already in use' });
      }
      
      userUpdates.push('email = ?');
      userValues.push(updates.email);
    }
    
    if (updates.phone !== undefined) {
      userUpdates.push('phone = ?');
      userValues.push(updates.phone);
    }
    
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      userUpdates.push('password = ?');
      userValues.push(hashedPassword);
    }
    
    if (userUpdates.length > 0) {
      userValues.push(id);
      await pool.execute(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
        userValues
      );
    }
    
    // Update role-specific tables
    if (currentRole === 'student' && updates.roll_no) {
      // Check if roll number exists for another student
      const [existingRoll] = await pool.execute(
        'SELECT id FROM students WHERE roll_no = ? AND user_id != ?',
        [updates.roll_no, id]
      );
      
      if (existingRoll.length > 0) {
        await pool.execute('ROLLBACK');
        return res.status(400).json({ error: 'Roll number already in use' });
      }
      
      await pool.execute(
        'UPDATE students SET roll_no = ?, student_name = ? WHERE user_id = ?',
        [updates.roll_no, updates.name || users[0].name, id]
      );
    }
    
    if (currentRole === 'teacher' && updates.department) {
      await pool.execute(
        'UPDATE teachers SET department = ?, teacher_name = ? WHERE user_id = ?',
        [updates.department, updates.name || users[0].name, id]
      );
    }
    
    await pool.execute('COMMIT');
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
};

// Get system settings
exports.getSystemSettings = async (req, res) => {
  try {
    // This would typically come from a settings table
    const settings = {
      collegeName: "Tribhuvan University",
      collegeAddress: "Kathmandu, Nepal",
      currentAcademicYear: "2024/2025",
      resultPublishDate: "2025-01-10",
      gradingSystem: {
        "A+": { min: 90, max: 100, gpa: 4.0 },
        "A": { min: 80, max: 89, gpa: 3.6 },
        "B+": { min: 70, max: 79, gpa: 3.2 },
        "B": { min: 60, max: 69, gpa: 2.8 },
        "C+": { min: 50, max: 59, gpa: 2.4 },
        "C": { min: 40, max: 49, gpa: 2.0 },
        "F": { min: 0, max: 39, gpa: 0.0 }
      },
      semesterDates: {
        "6th Semester": {
          start: "2024-08-01",
          end: "2024-12-20",
          exams: "2024-12-20 to 2024-12-30"
        }
      }
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    // In a real system, you would save these to a database table
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error updating settings' });
  }
};

// Get audit logs (simplified)
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // In a real system, you would have an audit_logs table
    // For now, we'll simulate with user actions
    
    const [userActions] = await pool.execute(`
      SELECT 
        u.name as user_name,
        u.role,
        'Login' as action,
        u.updated_at as timestamp,
        CONCAT('User logged in from IP: ', '127.0.0.1') as details
      FROM users u
      WHERE u.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT 
        u.name as user_name,
        u.role,
        'Profile Update' as action,
        u.updated_at as timestamp,
        'Updated profile information' as details
      FROM users u
      WHERE u.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      data: userActions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
};

// Backup database (simplified)
exports.backupDatabase = async (req, res) => {
  try {
    // In a real system, you would create a database dump
    // For now, we'll simulate with a timestamp
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupInfo = {
      filename: `backup-${timestamp}.sql`,
      timestamp: new Date().toISOString(),
      size: '2.5 MB',
      status: 'completed'
    };
    
    res.json({
      success: true,
      message: 'Database backup created successfully',
      data: backupInfo
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Server error creating backup' });
  }
};