require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { pool } = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET missing. Copy .env.example to .env first.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:5191').split(',') }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/results', require('./routes/results'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'down' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Anka API on http://localhost:${PORT}/api`);
  require('./utils/mailer').resume();
});
