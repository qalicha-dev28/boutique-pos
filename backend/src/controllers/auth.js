const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findByEmail, findById, createUser, getAllUsers, updateUser } = require('../models/user');
require('dotenv').config();

// ── Generate JWT Token ──────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ── Register New User ───────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check all fields are provided
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check valid role
    const validRoles = ['admin', 'manager', 'cashier', 'stock_controller'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role provided.' });
    }

    // Check if email already exists
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const user = await createUser(name, email, hashedPassword, role);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// ── Login ───────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check fields provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact admin.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// ── Get Current User ────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get All Users (admin only) ──────────────────────
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('GetUsers error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Update User (admin only) ────────────────────────
const updateUserHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active } = req.body;

    const user = await updateUser(id, name, role, is_active);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User updated successfully.', user });
  } catch (error) {
    console.error('UpdateUser error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { register, login, getMe, getUsers, updateUserHandler };