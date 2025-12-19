const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, roll_no, semester, program, department, qualification } = req.body;
    
    // Check if user already exists
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Start transaction
    await pool.execute('START TRANSACTION');
    
    // Insert into users table
    const [userResult] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    
    const userId = userResult.insertId;
    
    // Insert based on role
    if (role === 'student') {
      await pool.execute(
        'INSERT INTO students (user_id, roll_no, student_name, semester, program) VALUES (?, ?, ?, ?, ?)',
        [userId, roll_no, name, semester, program]
      );
    } else if (role === 'teacher') {
      await pool.execute(
        'INSERT INTO teachers (user_id, teacher_name, department, qualification) VALUES (?, ?, ?, ?)',
        [userId, name, department, qualification]
      );
    }
    
    // Commit transaction
    await pool.execute('COMMIT');
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role, name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: userId, name, email, role }
    });
    
  } catch (error) {
    await pool.execute('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const [users] = await pool.execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Get additional info based on role
    let additionalInfo = {};
    if (user.role === 'student') {
      const [studentInfo] = await pool.execute(
        'SELECT roll_no, semester, program FROM students WHERE user_id = ?',
        [user.id]
      );
      additionalInfo = studentInfo[0] || {};
    } else if (user.role === 'teacher') {
      const [teacherInfo] = await pool.execute(
        'SELECT department, qualification FROM teachers WHERE user_id = ?',
        [user.id]
      );
      additionalInfo = teacherInfo[0] || {};
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...additionalInfo
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Forgot Password - Send Reset Email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No user found with this email' });
    }
    
    const user = users[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store token in database
    await pool.execute(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, hashedToken, expiresAt]
    );
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Student Result System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Student Result Analysis System<br>
            Tribhuvan University
          </p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error sending reset email' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid token
    const [resetTokens] = await pool.execute(
      'SELECT email, expires_at FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [hashedToken]
    );
    
    if (resetTokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const resetToken = resetTokens[0];
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user password
    await pool.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, resetToken.email]
    );
    
    // Delete used token
    await pool.execute(
      'DELETE FROM password_resets WHERE token = ?',
      [hashedToken]
    );
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error resetting password' });
  }
};

// Get Current User Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info
    const [users] = await pool.execute(
      'SELECT id, name, email, role, profile_image, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    let additionalInfo = {};
    
    // Get role-specific info
    if (user.role === 'student') {
      const [studentInfo] = await pool.execute(
        'SELECT roll_no, semester, program, father_name, mother_name, address, phone, dob FROM students WHERE user_id = ?',
        [userId]
      );
      additionalInfo = studentInfo[0] || {};
    } else if (user.role === 'teacher') {
      const [teacherInfo] = await pool.execute(
        'SELECT department, qualification, experience FROM teachers WHERE user_id = ?',
        [userId]
      );
      additionalInfo = teacherInfo[0] || {};
    }
    
    res.json({
      success: true,
      user: {
        ...user,
        ...additionalInfo
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error getting profile' });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, address } = req.body;
    
    // Update user
    await pool.execute(
      'UPDATE users SET name = ? WHERE id = ?',
      [name, userId]
    );
    
    // Update student or teacher info
    const [userInfo] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    const role = userInfo[0].role;
    
    if (role === 'student') {
      await pool.execute(
        'UPDATE students SET phone = ?, address = ? WHERE user_id = ?',
        [phone, address, userId]
      );
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};