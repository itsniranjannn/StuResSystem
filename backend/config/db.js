require('dotenv').config();
const mysql = require('mysql2/promise');

const settings = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};
const DB_NAME = process.env.DB_NAME || 'student_result_system';

const pool = mysql.createPool({
  ...settings,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

const query = async (sql, params = []) => (await pool.query(sql, params))[0];

// Runs fn(conn) inside a real transaction on one dedicated connection.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function audit(user, action, detail) {
  try {
    await query('INSERT INTO audit_logs (user_id, user_name, action, detail) VALUES (?,?,?,?)',
      [user?.id ?? null, user?.name ?? 'system', action, String(detail || '').slice(0, 300)]);
  } catch (e) {
    console.error('audit failed', e.message);
  }
}

module.exports = { pool, query, withTransaction, audit, settings, DB_NAME };
