const pool = require('../config/db');

// ── Find user by email ──────────────────────────────
const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

// ── Find user by ID ─────────────────────────────────
const findById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

// ── Create new user ─────────────────────────────────
const createUser = async (name, email, hashedPassword, role) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, name, email, role, created_at`,
    [name, email, hashedPassword, role]
  );
  return result.rows[0];
};

// ── Get all users ───────────────────────────────────
const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

// ── Update user ─────────────────────────────────────
const updateUser = async (id, name, role, is_active) => {
  const result = await pool.query(
    `UPDATE users SET name = $1, role = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, name, email, role, is_active`,
    [name, role, is_active, id]
  );
  return result.rows[0];
};

module.exports = { findByEmail, findById, createUser, getAllUsers, updateUser };