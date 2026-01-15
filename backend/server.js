// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const db = require('./config/database');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Test database connection
db.testConnection().then(connected => {
    if (!connected) {
        console.error('❌ Cannot start server without database connection');
        process.exit(1);
    }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');
const resultRoutes = require('./routes/resultRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Student Result System API',
        version: '1.0.0'
    });
});

// Test endpoint
app.post('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        data: req.body,
        received: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Test POST: curl -X POST http://localhost:${PORT}/api/test -H "Content-Type: application/json" -d '{"test":"data"}'`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log(`💡 Try: kill -9 $(lsof -t -i:${PORT}) or change PORT in .env`);
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});