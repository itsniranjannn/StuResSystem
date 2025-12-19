const pool = require('../config/database');

// Get all results with filters
exports.getAllResults = async (req, res) => {
  try {
    const { semester, exam_year, program, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT r.*, s.program, s.semester, u.email, u.phone
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (semester) {
      query += ' AND r.semester = ?';
      params.push(parseInt(semester));
    }
    
    if (exam_year) {
      query += ' AND r.exam_year = ?';
      params.push(parseInt(exam_year));
    }
    
    if (program) {
      query += ' AND s.program = ?';
      params.push(program);
    }
    
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY r.rank, r.gpa DESC, r.total_marks DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [results] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (semester) {
      countQuery += ' AND r.semester = ?';
      countParams.push(parseInt(semester));
    }
    
    if (exam_year) {
      countQuery += ' AND r.exam_year = ?';
      countParams.push(parseInt(exam_year));
    }
    
    if (program) {
      countQuery += ' AND s.program = ?';
      countParams.push(program);
    }
    
    if (status) {
      countQuery += ' AND r.status = ?';
      countParams.push(status);
    }
    
    const [[{ total }]] = await pool.execute(countQuery, countParams);
    
    res.json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Server error fetching results' });
  }
};

// Get result by ID
exports.getResultById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [results] = await pool.execute(`
      SELECT r.*, s.*, u.email, u.phone as user_phone
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE r.id = ?
    `, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    
    // Get detailed marks for this result
    const [marks] = await pool.execute(`
      SELECT m.*, sj.name as subject_name, sj.code, sj.credit,
             t.teacher_name, u.email as teacher_email
      FROM marks m
      JOIN subjects sj ON m.subject_id = sj.id
      LEFT JOIN teachers t ON sj.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE m.student_id = ? AND m.exam_year = ? AND m.exam_type = 'final'
      ORDER BY sj.code
    `, [results[0].student_id, results[0].exam_year]);
    
    // Get GPA breakdown
    const gpaBreakdown = marks.map(mark => ({
      subject: mark.subject_name,
      code: mark.code,
      credit: mark.credit,
      marks: mark.marks_obtained,
      grade: calculateGrade(mark.marks_obtained),
      gradePoint: calculateGradePoint(mark.marks_obtained)
    }));
    
    // Calculate CGPA
    const totalCredits = gpaBreakdown.reduce((sum, sub) => sum + sub.credit, 0);
    const totalGradePoints = gpaBreakdown.reduce((sum, sub) => sum + (sub.gradePoint * sub.credit), 0);
    const calculatedCGPA = totalGradePoints / totalCredits;
    
    res.json({
      success: true,
      data: {
        ...results[0],
        marks,
        gpaBreakdown,
        calculatedCGPA: parseFloat(calculatedCGPA.toFixed(2)),
        totalCredits
      }
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Server error fetching result' });
  }
};

// Publish results (change status to published)
exports.publishResults = async (req, res) => {
  try {
    const { semester, exam_year, program } = req.body;
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Update results status
    let updateQuery = `
      UPDATE results r
      JOIN students s ON r.student_id = s.id
      SET r.status = 'published',
          r.published_at = NOW(),
          r.approved_by = ?
      WHERE r.status = 'pending'
    `;
    
    const params = [req.user.id];
    
    if (semester) {
      updateQuery += ' AND r.semester = ?';
      params.push(parseInt(semester));
    }
    
    if (exam_year) {
      updateQuery += ' AND r.exam_year = ?';
      params.push(parseInt(exam_year));
    }
    
    if (program) {
      updateQuery += ' AND s.program = ?';
      params.push(program);
    }
    
    const [updateResult] = await pool.execute(updateQuery, params);
    
    // Recalculate ranks for published results
    await recalculateRanks(semester, exam_year, program);
    
    await pool.execute('COMMIT');
    
    res.json({
      success: true,
      message: `Results published successfully. ${updateResult.affectedRows} results updated.`
    });
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Publish results error:', error);
    res.status(500).json({ error: 'Server error publishing results' });
  }
};

// Get result statistics
exports.getResultStats = async (req, res) => {
  try {
    const { semester, exam_year, program } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_students,
        AVG(gpa) as average_gpa,
        MIN(gpa) as min_gpa,
        MAX(gpa) as max_gpa,
        SUM(CASE WHEN grade = 'A+' THEN 1 ELSE 0 END) as a_plus_count,
        SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as a_count,
        SUM(CASE WHEN grade = 'B+' THEN 1 ELSE 0 END) as b_plus_count,
        SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as b_count,
        SUM(CASE WHEN grade = 'C+' THEN 1 ELSE 0 END) as c_plus_count,
        SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as c_count,
        SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) as f_count,
        COUNT(CASE WHEN gpa >= 3.6 THEN 1 END) as distinction_count,
        COUNT(CASE WHEN gpa >= 2.8 AND gpa < 3.6 THEN 1 END) as first_division_count,
        COUNT(CASE WHEN gpa >= 2.0 AND gpa < 2.8 THEN 1 END) as second_division_count,
        COUNT(CASE WHEN gpa < 2.0 THEN 1 END) as fail_count
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE r.status = 'published'
    `;
    
    const params = [];
    
    if (semester) {
      query += ' AND r.semester = ?';
      params.push(parseInt(semester));
    }
    
    if (exam_year) {
      query += ' AND r.exam_year = ?';
      params.push(parseInt(exam_year));
    }
    
    if (program) {
      query += ' AND s.program = ?';
      params.push(program);
    }
    
    const [[stats]] = await pool.execute(query, params);
    
    // Get top 10 students
    const [topStudents] = await pool.execute(`
      SELECT r.*, s.roll_no, s.program
      FROM results r
      JOIN students s ON r.student_id = s.id
      WHERE r.status = 'published'
        ${semester ? ' AND r.semester = ?' : ''}
        ${exam_year ? ' AND r.exam_year = ?' : ''}
        ${program ? ' AND s.program = ?' : ''}
      ORDER BY r.gpa DESC, r.total_marks DESC
      LIMIT 10
    `, params.filter(p => p !== undefined));
    
    // Get subject-wise averages
    const [subjectAverages] = await pool.execute(`
      SELECT 
        sj.name as subject_name,
        sj.code,
        AVG(m.marks_obtained) as average_marks,
        COUNT(DISTINCT m.student_id) as total_students,
        MIN(m.marks_obtained) as min_marks,
        MAX(m.marks_obtained) as max_marks
      FROM marks m
      JOIN subjects sj ON m.subject_id = sj.id
      JOIN results r ON m.student_id = r.student_id 
        AND m.exam_year = r.exam_year
      WHERE m.exam_type = 'final' 
        AND r.status = 'published'
        ${semester ? ' AND sj.semester = ?' : ''}
        ${exam_year ? ' AND m.exam_year = ?' : ''}
      GROUP BY sj.id
      ORDER BY sj.code
    `, params.filter(p => p !== undefined));
    
    res.json({
      success: true,
      data: {
        overallStats: stats,
        topStudents,
        subjectAverages
      }
    });
  } catch (error) {
    console.error('Get result stats error:', error);
    res.status(500).json({ error: 'Server error fetching result statistics' });
  }
};

// Generate result PDF (placeholder)
exports.generateResultPDF = async (req, res) => {
  try {
    const { resultId } = req.params;
    
    // In a real system, you would generate a PDF
    // For now, we'll return a placeholder
    
    const [results] = await pool.execute(`
      SELECT r.*, s.*, u.email
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE r.id = ?
    `, [resultId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    
    const result = results[0];
    
    const pdfData = {
      filename: `Result-${result.roll_no}-${result.exam_year}.pdf`,
      url: `/api/results/${resultId}/download`,
      generatedAt: new Date().toISOString(),
      student: {
        name: result.student_name,
        rollNo: result.roll_no,
        program: result.program,
        semester: result.semester
      },
      result: {
        gpa: result.gpa,
        grade: result.grade,
        rank: result.rank,
        status: result.status
      }
    };
    
    res.json({
      success: true,
      message: 'PDF generated successfully',
      data: pdfData
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Server error generating PDF' });
  }
};

// Helper functions
function calculateGrade(marks) {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B+';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C+';
  if (marks >= 40) return 'C';
  return 'F';
}

function calculateGradePoint(marks) {
  if (marks >= 90) return 4.0;
  if (marks >= 80) return 3.6;
  if (marks >= 70) return 3.2;
  if (marks >= 60) return 2.8;
  if (marks >= 50) return 2.4;
  if (marks >= 40) return 2.0;
  return 0.0;
}

// Helper function to recalculate ranks
async function recalculateRanks(semester, exam_year, program) {
  let query = `
    SELECT r.id, r.student_id, r.gpa, r.total_marks
    FROM results r
    JOIN students s ON r.student_id = s.id
    WHERE r.status = 'published'
  `;
  
  const params = [];
  
  if (semester) {
    query += ' AND r.semester = ?';
    params.push(semester);
  }
  
  if (exam_year) {
    query += ' AND r.exam_year = ?';
    params.push(exam_year);
  }
  
  if (program) {
    query += ' AND s.program = ?';
    params.push(program);
  }
  
  query += ' ORDER BY r.gpa DESC, r.total_marks DESC';
  
  const [results] = await pool.execute(query, params);
  
  // Update ranks
  for (let i = 0; i < results.length; i++) {
    await pool.execute(
      'UPDATE results SET rank = ? WHERE id = ?',
      [i + 1, results[i].id]
    );
  }
}