// backend/utils/rankingAlgorithm.js
const calculateGPA = (marks) => {
    const gradePoints = {
        'A+': 4.0, 'A': 3.6, 'B+': 3.2, 'B': 2.8,
        'C+': 2.4, 'C': 2.0, 'D': 1.6, 'F': 0.0
    };

    let totalPoints = 0;
    let totalCredits = 0;
    let subjectGrades = [];

    marks.forEach(mark => {
        const percentage = (mark.marks_obtained / mark.full_marks) * 100;
        let grade, point;

        if (percentage >= 90) { grade = 'A+'; point = 4.0; }
        else if (percentage >= 80) { grade = 'A'; point = 3.6; }
        else if (percentage >= 70) { grade = 'B+'; point = 3.2; }
        else if (percentage >= 60) { grade = 'B'; point = 2.8; }
        else if (percentage >= 50) { grade = 'C+'; point = 2.4; }
        else if (percentage >= 40) { grade = 'C'; point = 2.0; }
        else if (percentage >= 35) { grade = 'D'; point = 1.6; }
        else { grade = 'F'; point = 0.0; }

        totalPoints += point * mark.credit;
        totalCredits += mark.credit;
        subjectGrades.push({ subject: mark.subject_name, grade, marks: mark.marks_obtained });
    });

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalCredits,
        subjectGrades,
        percentage: (gpa / 4.0) * 100
    };
};

const calculateRankings = async (db, semester, examYear) => {
    try {
        const [students] = await db.query(`
            SELECT s.* 
            FROM students s
            WHERE s.semester = ?
        `, [semester]);

        const studentResults = [];

        for (const student of students) {
            const [marks] = await db.query(`
                SELECT m.*, sub.name as subject_name, sub.credit
                FROM marks m
                JOIN subjects sub ON m.subject_id = sub.id
                WHERE m.student_id = ? AND m.exam_year = ?
            `, [student.id, examYear]);

            if (marks.length > 0) {
                const result = calculateGPA(marks);
                studentResults.push({
                    studentId: student.id,
                    rollNo: student.roll_no,
                    studentName: student.student_name,
                    ...result,
                    totalMarks: marks.reduce((sum, m) => sum + parseFloat(m.marks_obtained), 0)
                });
            }
        }

        // Sort by total marks
        studentResults.sort((a, b) => b.totalMarks - a.totalMarks);

        // Assign ranks with tie handling
        let currentRank = 1;
        let previousMarks = null;
        let skipCount = 0;

        studentResults.forEach((student, index) => {
            if (previousMarks !== null && Math.abs(student.totalMarks - previousMarks) < 0.01) {
                student.rank = currentRank - 1;
                skipCount++;
            } else {
                student.rank = currentRank + skipCount;
                currentRank = student.rank;
                skipCount = 0;
            }
            previousMarks = student.totalMarks;
        });

        // Store in database
        for (const result of studentResults) {
            await db.query(`
                INSERT INTO results (
                    student_id, student_name, roll_no, semester,
                    total_marks, total_credits, gpa, grade, rank, exam_year
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    total_marks = VALUES(total_marks),
                    total_credits = VALUES(total_credits),
                    gpa = VALUES(gpa),
                    grade = VALUES(grade),
                    rank = VALUES(rank),
                    updated_at = NOW()
            `, [
                result.studentId,
                result.studentName,
                result.rollNo,
                semester,
                result.totalMarks,
                result.totalCredits,
                result.gpa,
                result.gpa >= 3.6 ? 'A' : result.gpa >= 3.2 ? 'B+' : 'B',
                result.rank,
                examYear
            ]);
        }

        return {
            success: true,
            message: `Rankings calculated for ${studentResults.length} students`,
            data: studentResults
        };

    } catch (error) {
        console.error('Ranking calculation error:', error);
        throw error;
    }
};

module.exports = { calculateGPA, calculateRankings };