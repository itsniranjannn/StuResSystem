// backend/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_result_system',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Query helper function
const query = async (sql, params) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database Query Error:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
};

// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database Connected Successfully');
        await connection.ping();
        console.log('✅ Database ping successful');
        connection.release();
        return true;
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        console.error('❌ Please check:');
        console.error('   - MySQL service is running');
        console.error('   - Database credentials in .env');
        console.error('   - Database name exists');
        return false;
    }
};

// Get connection for transactions
const getConnection = async () => {
    return await pool.getConnection();
};

module.exports = { 
    pool, 
    query, 
    getConnection,
    testConnection 
};