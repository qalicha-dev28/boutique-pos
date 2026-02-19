const express = require('express');
const router = express.Router();
const { register, login, getMe, getUsers, updateUserHandler } = require('../controllers/auth');
const { protect, checkRole } = require('../middleware/auth');

// ── Public Routes (no token needed) ────────────────
router.post('/login', login);

// ── Protected Routes (token required) ──────────────
router.post('/register', protect, checkRole('admin', 'manager'), register);
router.get('/me', protect, getMe);
router.get('/users', protect, checkRole('admin', 'manager'), getUsers);
router.put('/users/:id', protect, checkRole('admin'), updateUserHandler);

module.exports = router;
