const calculateGrade = (marks) => {
    if (marks >= 90) return { grade: 'A+', point: 4.0 };
    if (marks >= 80) return { grade: 'A', point: 3.6 };
    if (marks >= 70) return { grade: 'B+', point: 3.2 };
    if (marks >= 60) return { grade: 'B', point: 2.8 };
    if (marks >= 50) return { grade: 'C+', point: 2.4 };
    if (marks >= 40) return { grade: 'C', point: 2.0 };
    if (marks >= 35) return { grade: 'D', point: 1.6 };
    return { grade: 'F', point: 0.0 };
};

const calculateGPA = (subjects) => {
    let totalPoints = 0;
    let totalCredits = 0;
    let totalMarks = 0;
    
    subjects.forEach(subject => {
        const grade = calculateGrade(subject.marks);
        totalPoints += (grade.point * subject.credit);
        totalCredits += subject.credit;
        totalMarks += subject.marks;
    });
    
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    
    return {
        gpa: parseFloat(gpa.toFixed(2)),
        totalMarks: parseFloat(totalMarks.toFixed(2)),
        totalCredits,
        percentage: parseFloat(((totalMarks / (subjects.length * 100)) * 100).toFixed(2))
    };
};

const calculateRankings = async (db, semester, examYear) => {
    try {
        // Get all students for semester
        const students = await db.query(`
            SELECT s.id, s.roll_no, s.student_name, s.semester
            FROM students s
            WHERE s.semester = ?
        `, [semester]);
        
        if (students.length === 0) {
            return { success: false, message: 'No students found for this semester' };
        }
        
        const rankedStudents = [];
        
        // Calculate for each student
        for (const student of students) {
            const marks = await db.query(`
                SELECT m.marks_obtained as marks, s.credit, s.name as subject_name
                FROM marks m
                JOIN subjects s ON m.subject_id = s.id
                WHERE m.student_id = ? AND m.exam_year = ?
            `, [student.id, examYear]);
            
            if (marks.length > 0) {
                const subjects = marks.map(mark => ({
                    marks: mark.marks,
                    credit: mark.credit
                }));
                
                const gpaDetails = calculateGPA(subjects);
                
                rankedStudents.push({
                    studentId: student.id,
                    rollNo: student.roll_no,
                    studentName: student.student_name,
                    semester: student.semester,
                    totalMarks: gpaDetails.totalMarks,
                    gpa: gpaDetails.gpa,
                    percentage: gpaDetails.percentage,
                    totalCredits: gpaDetails.totalCredits,
                    subjectCount: marks.length
                });
            }
        }
        
        // Sort by total marks
        rankedStudents.sort((a, b) => b.totalMarks - a.totalMarks);
        
        // Assign ranks with tie handling
        let currentRank = 1;
        let previousMarks = null;
        let skipCount = 0;
        
        for (let i = 0; i < rankedStudents.length; i++) {
            const student = rankedStudents[i];
            
            if (previousMarks !== null && Math.abs(student.totalMarks - previousMarks) < 0.01) {
                student.rank = currentRank - 1;
                skipCount++;
            } else {
                student.rank = currentRank + skipCount;
                currentRank = student.rank;
                skipCount = 0;
            }
            
            previousMarks = student.totalMarks;
            
            // Assign final grade
            if (student.gpa >= 3.6) student.finalGrade = 'A+';
            else if (student.gpa >= 3.2) student.finalGrade = 'A';
            else if (student.gpa >= 2.8) student.finalGrade = 'B+';
            else if (student.gpa >= 2.4) student.finalGrade = 'B';
            else if (student.gpa >= 2.0) student.finalGrade = 'C+';
            else if (student.gpa >= 1.6) student.finalGrade = 'C';
            else if (student.gpa >= 1.2) student.finalGrade = 'D';
            else student.finalGrade = 'F';
        }
        
        // Store in database
        for (const student of rankedStudents) {
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
                student.studentId,
                student.studentName,
                student.rollNo,
                student.semester,
                student.totalMarks,
                student.totalCredits,
                student.gpa,
                student.finalGrade,
                student.rank,
                examYear
            ]);
        }
        
        return {
            success: true,
            message: `Ranking calculated for ${rankedStudents.length} students`,
            data: rankedStudents,
            semester,
            examYear
        };
        
    } catch (error) {
        console.error('Ranking calculation error:', error);
        throw error;
    }
};

module.exports = {
    calculateGrade,
    calculateGPA,
    calculateRankings
};