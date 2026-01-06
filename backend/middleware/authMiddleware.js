const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }
        
        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production', async (err, decoded) => {
            if (err) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Invalid or expired token' 
                });
            }
            
            // Fetch user from database
            const [users] = await db.query(
                'SELECT id, name, email, role, profile_image, is_active FROM users WHERE id = ?',
                [decoded.id]
            );
            
            if (users.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }
            
            const user = users[0];
            
            // Fetch role-specific data
            if (user.role === 'student') {
                const [students] = await db.query(
                    'SELECT * FROM students WHERE user_id = ?',
                    [user.id]
                );
                user.student_data = students[0] || null;
            } else if (user.role === 'teacher') {
                const [teachers] = await db.query(
                    'SELECT * FROM teachers WHERE user_id = ?',
                    [user.id]
                );
                user.teacher_data = teachers[0] || null;
            }
            
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }
    
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }
        
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Insufficient permissions' 
            });
        }
        
        next();
    };
};

module.exports = { authenticateToken, authorize };