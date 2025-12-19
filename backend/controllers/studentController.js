const pool = require('../config/database');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.execute(`
      SELECT s.*, u.email, u.phone as user_phone, u.profile_image, 
             u.created_at as account_created
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.roll_no
    `);
    
    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Server error fetching students' });
  }
};

// Get single student
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [students] = await pool.execute(`
      SELECT s.*, u.email, u.phone as user_phone, u.profile_image,
             u.created_at as account_created
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [id]);
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get student marks
    const [marks] = await pool.execute(`
      SELECT m.*, sj.name as subject_name, sj.code as subject_code, 
             sj.credit, sj.teacher_id, t.teacher_name
      FROM marks m
      JOIN subjects sj ON m.subject_id = sj.id
      LEFT JOIN teachers t ON sj.teacher_id = t.id
      WHERE m.student_id = ?
      ORDER BY sj.code
    `, [id]);
    
    // Get student result
    const [results] = await pool.execute(`
      SELECT * FROM results 
      WHERE student_id = ? 
      ORDER BY exam_year DESC, semester DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...students[0],
        marks,
        results
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Server error fetching student' });
  }
};

// Create student
exports.createStudent = async (req, res) => {
  try {
    const { 
      name, email, phone, roll_no, semester, program,
      father_name, mother_name, address, dob, password 
    } = req.body;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Check if email exists
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmail.length > 0) {
      await pool.execute('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Check if roll number exists
    const [existingRoll] = await pool.execute(
      'SELECT id FROM students WHERE roll_no = ?',
      [roll_no]
    );
    
    if (existingRoll.length > 0) {
      await pool.execute('ROLLBACK');
      return res.status(400).json({ error: 'Roll number already exists' });
    }
    
    // Hash password (using bcrypt in auth controller)
    // This will be handled in a separate function
    
    // Insert user
    const [userResult] = await pool.execute(
      `INSERT INTO users (name, email, phone, password, role) 
       VALUES (?, ?, ?, ?, 'student')`,
      [name, email, phone, password] // Password should be hashed
    );
    
    const userId = userResult.insertId;
    
    // Insert student
    await pool.execute(
      `INSERT INTO students (user_id, roll_no, student_name, semester, program, 
        father_name, mother_name, address, phone, dob) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, roll_no, name, semester, program, 
       father_name, mother_name, address, phone, dob]
    );
    
    await pool.execute('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: { userId, roll_no, name, email }
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Server error creating student' });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Get user_id from student
    const [students] = await pool.execute(
      'SELECT user_id FROM students WHERE id = ?',
      [id]
    );
    
    if (students.length === 0) {
      await pool.execute('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const userId = students[0].user_id;
    
    // Update user table
    if (updates.name || updates.email || updates.phone) {
      const userUpdates = [];
      const userValues = [];
      
      if (updates.name) {
        userUpdates.push('name = ?');
        userValues.push(updates.name);
      }
      
      if (updates.email) {
        // Check if email already exists for another user
        const [existingEmail] = await pool.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [updates.email, userId]
        );
        
        if (existingEmail.length > 0) {
          await pool.execute('ROLLBACK');
          return res.status(400).json({ error: 'Email already in use' });
        }
        
        userUpdates.push('email = ?');
        userValues.push(updates.email);
      }
      
      if (updates.phone) {
        userUpdates.push('phone = ?');
        userValues.push(updates.phone);
      }
      
      if (userUpdates.length > 0) {
        userValues.push(userId);
        await pool.execute(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
          userValues
        );
      }
    }
    
    // Update student table
    const studentUpdates = [];
    const studentValues = [];
    
    const studentFields = ['roll_no', 'semester', 'program', 'father_name', 
                          'mother_name', 'address', 'phone', 'dob'];
    
    studentFields.forEach(field => {
      if (updates[field] !== undefined) {
        studentUpdates.push(`${field} = ?`);
        studentValues.push(updates[field]);
      }
    });
    
    // Also update student_name if name was updated
    if (updates.name) {
      studentUpdates.push('student_name = ?');
      studentValues.push(updates.name);
    }
    
    if (studentUpdates.length > 0) {
      studentValues.push(id);
      await pool.execute(
        `UPDATE students SET ${studentUpdates.join(', ')} WHERE id = ?`,
        studentValues
      );
    }
    
    await pool.execute('COMMIT');
    
    res.json({
      success: true,
      message: 'Student updated successfully'
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Server error updating student' });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user_id first
    const [students] = await pool.execute(
      'SELECT user_id FROM students WHERE id = ?',
      [id]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const userId = students[0].user_id;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Delete student (cascade will delete marks and results)
    await pool.execute('DELETE FROM students WHERE id = ?', [id]);
    
    // Delete user
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    
    await pool.execute('COMMIT');
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Server error deleting student' });
  }
};

// Get student marks
exports.getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const [marks] = await pool.execute(`
      SELECT m.*, sj.name as subject_name, sj.code, sj.credit,
             t.teacher_name, u.email as teacher_email
      FROM marks m
      JOIN subjects sj ON m.subject_id = sj.id
      LEFT JOIN teachers t ON sj.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE m.student_id = ?
      ORDER BY sj.semester, sj.code
    `, [studentId]);
    
    res.json({
      success: true,
      data: marks
    });
  } catch (error) {
    console.error('Get marks error:', error);
    res.status(500).json({ error: 'Server error fetching marks' });
  }
};

// Add marks for student
exports.addMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject_id, marks_obtained, exam_type, exam_year } = req.body;
    
    // Get student and subject details
    const [students] = await pool.execute(
      'SELECT student_name FROM students WHERE id = ?',
      [studentId]
    );
    
    const [subjects] = await pool.execute(
      'SELECT name FROM subjects WHERE id = ?',
      [subject_id]
    );
    
    if (students.length === 0 || subjects.length === 0) {
      return res.status(404).json({ error: 'Student or subject not found' });
    }
    
    // Check if marks already exist
    const [existingMarks] = await pool.execute(
      `SELECT id FROM marks 
       WHERE student_id = ? AND subject_id = ? 
       AND exam_type = ? AND exam_year = ?`,
      [studentId, subject_id, exam_type, exam_year]
    );
    
    if (existingMarks.length > 0) {
      return res.status(400).json({ error: 'Marks already exist for this exam' });
    }
    
    // Insert marks
    await pool.execute(
      `INSERT INTO marks (student_id, student_name, subject_id, subject_name,
        marks_obtained, exam_type, exam_year) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, students[0].student_name, subject_id, subjects[0].name,
       marks_obtained, exam_type, exam_year]
    );
    
    // Recalculate result
    await recalculateStudentResult(studentId, exam_year);
    
    res.status(201).json({
      success: true,
      message: 'Marks added successfully'
    });
    
  } catch (error) {
    console.error('Add marks error:', error);
    res.status(500).json({ error: 'Server error adding marks' });
  }
};

// Update marks
exports.updateMarks = async (req, res) => {
  try {
    const { marksId } = req.params;
    const { marks_obtained } = req.body;
    
    // Get current marks to find student and year
    const [currentMarks] = await pool.execute(
      'SELECT student_id, exam_year FROM marks WHERE id = ?',
      [marksId]
    );
    
    if (currentMarks.length === 0) {
      return res.status(404).json({ error: 'Marks not found' });
    }
    
    const { student_id, exam_year } = currentMarks[0];
    
    // Update marks
    await pool.execute(
      'UPDATE marks SET marks_obtained = ? WHERE id = ?',
      [marks_obtained, marksId]
    );
    
    // Recalculate result
    await recalculateStudentResult(student_id, exam_year);
    
    res.json({
      success: true,
      message: 'Marks updated successfully'
    });
    
  } catch (error) {
    console.error('Update marks error:', error);
    res.status(500).json({ error: 'Server error updating marks' });
  }
};

// Helper function to recalculate student result
async function recalculateStudentResult(studentId, examYear) {
  // Calculate total marks and average
  const [marks] = await pool.execute(`
    SELECT AVG(marks_obtained) as avg_marks, SUM(marks_obtained) as total_marks
    FROM marks 
    WHERE student_id = ? AND exam_type = 'final' AND exam_year = ?
  `, [studentId, examYear]);
  
  if (marks.length === 0) return;
  
  const { avg_marks, total_marks } = marks[0];
  
  // Calculate GPA and Grade
  let gpa = 0.0;
  let grade = 'F';
  
  if (avg_marks >= 90) {
    gpa = 4.0; grade = 'A+';
  } else if (avg_marks >= 80) {
    gpa = 3.6; grade = 'A';
  } else if (avg_marks >= 70) {
    gpa = 3.2; grade = 'B+';
  } else if (avg_marks >= 60) {
    gpa = 2.8; grade = 'B';
  } else if (avg_marks >= 50) {
    gpa = 2.4; grade = 'C+';
  } else if (avg_marks >= 40) {
    gpa = 2.0; grade = 'C';
  }
  
  // Get student details
  const [students] = await pool.execute(
    'SELECT student_name, roll_no, semester FROM students WHERE id = ?',
    [studentId]
  );
  
  if (students.length === 0) return;
  
  const { student_name, roll_no, semester } = students[0];
  
  // Update or insert result
  await pool.execute(`
    INSERT INTO results (student_id, student_name, roll_no, total_marks, 
      gpa, grade, semester, exam_year, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ON DUPLICATE KEY UPDATE
      total_marks = VALUES(total_marks),
      gpa = VALUES(gpa),
      grade = VALUES(grade),
      status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  `, [studentId, student_name, roll_no, total_marks, gpa, grade, semester, examYear]);
  
  // Recalculate ranks for the semester and year
  await recalculateRanks(semester, examYear);
}

// Helper function to recalculate ranks
async function recalculateRanks(semester, examYear) {
  // Get all results for the semester and year
  const [results] = await pool.execute(`
    SELECT id, student_id, gpa, total_marks
    FROM results 
    WHERE semester = ? AND exam_year = ? AND status != 'pending'
    ORDER BY gpa DESC, total_marks DESC
  `, [semester, examYear]);
  
  // Update ranks
  for (let i = 0; i < results.length; i++) {
    await pool.execute(
      'UPDATE results SET rank = ? WHERE id = ?',
      [i + 1, results[i].id]
    );
  }
}