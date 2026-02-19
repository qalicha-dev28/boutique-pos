const pool = require('../config/db');

// ── Get all customers ───────────────────────────────
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customers 
       WHERE is_active = true 
       ORDER BY name ASC`
    );
    res.json({ customers: result.rows });
  } catch (error) {
    console.error('GetAll customers error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get single customer ─────────────────────────────
const getOne = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('GetOne customer error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Search customers ────────────────────────────────
const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const result = await pool.query(
      `SELECT * FROM customers 
       WHERE is_active = true AND (
         name ILIKE $1 OR
         phone ILIKE $1 OR
         email ILIKE $1
       )
       ORDER BY name ASC`,
      [`%${q}%`]
    );
    res.json({ customers: result.rows });
  } catch (error) {
    console.error('Search customers error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Create customer ─────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, phone, email, birthday, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, birthday, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, phone || null, email || null, birthday || null, notes || null]
    );

    res.status(201).json({
      message: 'Customer created successfully.',
      customer: result.rows[0]
    });
  } catch (error) {
    console.error('Create customer error:', error.message);
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({ error: 'Phone or email already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Update customer ─────────────────────────────────
const update = async (req, res) => {
  try {
    const { name, phone, email, birthday, notes } = req.body;

    const result = await pool.query(
      `UPDATE customers SET
       name=$1, phone=$2, email=$3, 
       birthday=$4, notes=$5,
       updated_at=CURRENT_TIMESTAMP
       WHERE id=$6 RETURNING *`,
      [name, phone || null, email || null, 
       birthday || null, notes || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ 
      message: 'Customer updated successfully.', 
      customer: result.rows[0] 
    });
  } catch (error) {
    console.error('Update customer error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Add loyalty points ──────────────────────────────
const addLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;

    if (!points) {
      return res.status(400).json({ error: 'Points value is required.' });
    }

    const result = await pool.query(
      `UPDATE customers 
       SET loyalty_points = loyalty_points + $1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [points, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ 
      message: 'Loyalty points updated.',
      customer: result.rows[0] 
    });
  } catch (error) {
    console.error('AddLoyaltyPoints error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get customer purchase history ───────────────────
const getPurchaseHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
       COUNT(si.id) AS items_count
       FROM sales s
       LEFT JOIN sale_items si ON s.id = si.sale_id
       WHERE s.customer_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    res.json({ purchases: result.rows });
  } catch (error) {
    console.error('GetPurchaseHistory error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { 
  getAll, getOne, search, create, 
  update, addLoyaltyPoints, getPurchaseHistory 
};