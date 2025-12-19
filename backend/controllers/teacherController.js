const pool = require('../config/database');

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const [teachers] = await pool.execute(`
      SELECT t.*, u.email, u.phone, u.profile_image,
             u.created_at as account_created
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.teacher_name
    `);
    
    res.json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Server error fetching teachers' });
  }
};

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [teachers] = await pool.execute(`
      SELECT t.*, u.email, u.phone, u.profile_image,
             u.created_at as account_created
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Get subjects taught by this teacher
    const [subjects] = await pool.execute(`
      SELECT s.*, COUNT(DISTINCT m.student_id) as total_students
      FROM subjects s
      LEFT JOIN marks m ON s.id = m.subject_id
      WHERE s.teacher_id = ?
      GROUP BY s.id
      ORDER BY s.semester, s.code
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...teachers[0],
        subjects
      }
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ error: 'Server error fetching teacher' });
  }
};

// Get teacher's dashboard stats
exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get teacher info
    const [teachers] = await pool.execute(
      'SELECT id FROM teachers WHERE user_id = ?',
      [teacherId]
    );
    
    if (teachers.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const teacherDbId = teachers[0].id;
    
    // Get stats
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT s.id) as total_subjects,
        COUNT(DISTINCT m.student_id) as total_students,
        AVG(m.marks_obtained) as average_marks,
        COUNT(DISTINCT CASE WHEN m.exam_type = 'final' THEN m.student_id END) as students_graded
      FROM subjects s
      LEFT JOIN marks m ON s.id = m.subject_id
      WHERE s.teacher_id = ?
    `, [teacherDbId]);
    
    // Get recent marks added
    const [recentMarks] = await pool.execute(`
      SELECT m.*, s.student_name, sj.name as subject_name, sj.code
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN subjects sj ON m.subject_id = sj.id
      WHERE sj.teacher_id = ?
      ORDER BY m.created_at DESC
      LIMIT 10
    `, [teacherDbId]);
    
    // Get subjects with pending marks
    const [pendingSubjects] = await pool.execute(`
      SELECT s.*, 
        COUNT(DISTINCT st.id) as total_enrolled,
        COUNT(DISTINCT m.student_id) as marks_entered
      FROM subjects s
      JOIN students st ON st.semester = s.semester
      LEFT JOIN marks m ON s.id = m.subject_id AND m.student_id = st.id AND m.exam_type = 'final'
      WHERE s.teacher_id = ? AND s.semester = 6
      GROUP BY s.id
    `, [teacherDbId]);
    
    res.json({
      success: true,
      data: {
        stats: stats[0] || {},
        recentMarks,
        pendingSubjects
      }
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ error: 'Server error fetching dashboard' });
  }
};

// Get students for a subject
exports.getSubjectStudents = async (req, res) => {
  try {
    const { subjectId } = req.params;
    
    const [students] = await pool.execute(`
      SELECT s.*, m.marks_obtained, m.exam_type, m.exam_year
      FROM students s
      LEFT JOIN marks m ON s.id = m.student_id AND m.subject_id = ?
      WHERE s.semester = (SELECT semester FROM subjects WHERE id = ?)
      ORDER BY s.roll_no
    `, [subjectId, subjectId]);
    
    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get subject students error:', error);
    res.status(500).json({ error: 'Server error fetching students' });
  }
};

// Bulk update marks for subject
exports.bulkUpdateMarks = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { marks, exam_type, exam_year } = req.body;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Get subject details
    const [subjects] = await pool.execute(
      'SELECT name, semester FROM subjects WHERE id = ?',
      [subjectId]
    );
    
    if (subjects.length === 0) {
      await pool.execute('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    const subjectName = subjects[0].name;
    const semester = subjects[0].semester;
    
    // Process each student's marks
    for (const mark of marks) {
      const { student_id, marks_obtained } = mark;
      
      // Get student name
      const [students] = await pool.execute(
        'SELECT student_name FROM students WHERE id = ?',
        [student_id]
      );
      
      if (students.length === 0) continue;
      
      const studentName = students[0].student_name;
      
      // Check if marks already exist
      const [existing] = await pool.execute(`
        SELECT id FROM marks 
        WHERE student_id = ? AND subject_id = ? 
        AND exam_type = ? AND exam_year = ?
      `, [student_id, subjectId, exam_type, exam_year]);
      
      if (existing.length > 0) {
        // Update existing marks
        await pool.execute(
          'UPDATE marks SET marks_obtained = ? WHERE id = ?',
          [marks_obtained, existing[0].id]
        );
      } else {
        // Insert new marks
        await pool.execute(`
          INSERT INTO marks (student_id, student_name, subject_id, subject_name,
            marks_obtained, exam_type, exam_year)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [student_id, studentName, subjectId, subjectName, 
            marks_obtained, exam_type, exam_year]);
      }
      
      // Recalculate result if it's final exam
      if (exam_type === 'final') {
        await recalculateStudentResult(student_id, exam_year);
      }
    }
    
    await pool.execute('COMMIT');
    
    res.json({
      success: true,
      message: 'Marks updated successfully'
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Bulk update marks error:', error);
    res.status(500).json({ error: 'Server error updating marks' });
  }
};

// Import recalculate function
const { recalculateStudentResult } = require('./studentController');