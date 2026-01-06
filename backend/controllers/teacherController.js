const db = require('../config/database');

// Get all teachers
const getAllTeachers = async (req, res) => {
    try {
        const { page = 1, limit = 10, department, search } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT t.*, u.email, u.profile_image, u.is_active
            FROM teachers t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (department && department !== 'all') {
            query += ` AND t.department = ?`;
            params.push(department);
        }
        
        if (search) {
            query += ` AND (t.teacher_name LIKE ? OR u.email LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }
        
        query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [teachers] = await db.query(query, params);
        
        // Get total
        let countQuery = `
            SELECT COUNT(*) as total FROM teachers t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE 1=1
        `;
        
        if (department && department !== 'all') {
            countQuery += ` AND t.department = ?`;
        }
        if (search) {
            countQuery += ` AND (t.teacher_name LIKE ? OR u.email LIKE ?)`;
        }
        
        const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2));
        const total = countResult[0]?.total || 0;
        
        res.json({
            success: true,
            data: teachers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch teachers' 
        });
    }
};

// Get teacher by ID
const getTeacherById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [teachers] = await db.query(`
            SELECT t.*, u.email, u.profile_image, u.is_active
            FROM teachers t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `, [id]);
        
        if (teachers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Teacher not found' 
            });
        }
        
        const teacher = teachers[0];
        
        // Get assigned subjects
        const [subjects] = await db.query(`
            SELECT s.* FROM subjects s
            WHERE s.teacher_id = ?
            ORDER BY s.semester, s.code
        `, [id]);
        
        teacher.subjects = subjects;
        
        res.json({
            success: true,
            data: teacher
        });
        
    } catch (error) {
        console.error('Get teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch teacher' 
        });
    }
};

// Create teacher
const createTeacher = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { name, email, password = 'teacher123', teacher_name, department = 'Computer Science' } = req.body;
        
        if (!name || !email || !teacher_name) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Name, email and teacher name are required'
            });
        }
        
        // Check email
        const [existing] = await connection.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [userResult] = await connection.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'teacher']
        );
        const userId = userResult.insertId;
        
        // Create teacher
        await connection.query(
            `INSERT INTO teachers (user_id, teacher_name, department)
             VALUES (?, ?, ?)`,
            [userId, teacher_name, department]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Teacher created successfully',
            data: { userId, email, teacher_name }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Create teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create teacher' 
        });
    } finally {
        connection.release();
    }
};

// Update teacher
const updateTeacher = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const updateData = req.body;
        
        // Get user_id
        const [teachers] = await connection.query(
            'SELECT user_id FROM teachers WHERE id = ?',
            [id]
        );
        if (teachers.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        const userId = teachers[0].user_id;
        
        // Update user
        const userUpdates = {};
        if (updateData.name) userUpdates.name = updateData.name;
        if (updateData.email) {
            const [existing] = await connection.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [updateData.email, userId]
            );
            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            userUpdates.email = updateData.email;
        }
        
        if (Object.keys(userUpdates).length > 0) {
            await connection.query(
                'UPDATE users SET ? WHERE id = ?',
                [userUpdates, userId]
            );
        }
        
        // Update teacher
        const teacherUpdates = { ...updateData };
        delete teacherUpdates.name;
        delete teacherUpdates.email;
        delete teacherUpdates.password;
        
        if (Object.keys(teacherUpdates).length > 0) {
            await connection.query(
                'UPDATE teachers SET ? WHERE id = ?',
                [teacherUpdates, id]
            );
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Teacher updated successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Update teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update teacher' 
        });
    } finally {
        connection.release();
    }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
    const connection = await db.pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Get user_id
        const [teachers] = await connection.query(
            'SELECT user_id FROM teachers WHERE id = ?',
            [id]
        );
        if (teachers.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }
        const userId = teachers[0].user_id;
        
        // Delete teacher
        await connection.query('DELETE FROM teachers WHERE id = ?', [id]);
        
        // Delete user
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Teacher deleted successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Delete teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete teacher' 
        });
    } finally {
        connection.release();
    }
};

// Export all functions
module.exports = {
    getAllTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher
};