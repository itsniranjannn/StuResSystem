const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_result_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promise wrapper for pool
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('📌 Please check:');
    console.log('   1. MySQL service is running');
    console.log('   2. Database credentials in .env');
    console.log('   3. Database exists: student_result_system');
  } else {
    console.log('✅ Connected to MySQL database');
    connection.release();
  }
});

module.exports = promisePool;