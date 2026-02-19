const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

require('./config/db');

const app = express();

// ── Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check Route ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Boutique POS API is running 🚀',
    timestamp: new Date()
  });
});

// ── Routes ──────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));

// ── Global Error Handler ────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong on the server.' 
  });
});

// ── Start Server ────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});