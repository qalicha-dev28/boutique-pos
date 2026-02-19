const pool = require('../config/db');

// ── Get all inventory ───────────────────────────────
const getInventory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, p.name AS product_name, 
       p.sku, p.barcode, p.selling_price,
       c.name AS category_name
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = true
       ORDER BY p.name ASC`
    );
    res.json({ inventory: result.rows });
  } catch (error) {
    console.error('GetInventory error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get low stock items ─────────────────────────────
const getLowStock = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, p.name AS product_name,
       p.sku, p.selling_price,
       c.name AS category_name
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE i.quantity <= i.reorder_level
       AND p.is_active = true
       ORDER BY i.quantity ASC`
    );
    res.json({ 
      count: result.rows.length,
      items: result.rows 
    });
  } catch (error) {
    console.error('GetLowStock error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get expiring items ──────────────────────────────
const getExpiring = async (req, res) => {
  try {
    const days = req.query.days || 30;
    const result = await pool.query(
      `SELECT i.*, p.name AS product_name,
       p.sku, p.selling_price
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.expiry_date IS NOT NULL
       AND i.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
       AND i.expiry_date >= CURRENT_DATE
       AND p.is_active = true
       ORDER BY i.expiry_date ASC`
    );
    res.json({ 
      count: result.rows.length,
      items: result.rows 
    });
  } catch (error) {
    console.error('GetExpiring error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Adjust stock ────────────────────────────────────
const adjustStock = async (req, res) => {
  try {
    const { product_id, type, quantity, reason, variant_id } = req.body;

    // Validate fields
    if (!product_id || !type || !quantity) {
      return res.status(400).json({ 
        error: 'product_id, type and quantity are required.' 
      });
    }

    const validTypes = ['damage', 'loss', 'return', 'correction', 'restock'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid adjustment type.' });
    }

    // Get current stock
    const current = await pool.query(
      'SELECT * FROM inventory WHERE product_id = $1',
      [product_id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Product inventory not found.' });
    }

    const currentQty = current.rows[0].quantity;

    // Calculate new quantity
    let newQuantity;
    if (type === 'restock' || type === 'return') {
      newQuantity = currentQty + parseInt(quantity);
    } else {
      newQuantity = currentQty - parseInt(quantity);
    }

    // Prevent negative stock
    if (newQuantity < 0) {
      return res.status(400).json({ 
        error: `Insufficient stock. Current stock: ${currentQty}` 
      });
    }

    // Update inventory
    await pool.query(
      `UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2`,
      [newQuantity, product_id]
    );

    // Record the adjustment
    await pool.query(
      `INSERT INTO stock_adjustments 
       (product_id, variant_id, type, quantity, reason, adjusted_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [product_id, variant_id || null, type, quantity, reason || null, req.user.id]
    );

    res.json({
      message: 'Stock adjusted successfully.',
      previous_quantity: currentQty,
      new_quantity: newQuantity,
      adjustment: { type, quantity, reason }
    });

  } catch (error) {
    console.error('AdjustStock error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get stock adjustment history ────────────────────
const getAdjustmentHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, p.name AS product_name,
       u.name AS adjusted_by_name
       FROM stock_adjustments sa
       JOIN products p ON sa.product_id = p.id
       LEFT JOIN users u ON sa.adjusted_by = u.id
       ORDER BY sa.created_at DESC
       LIMIT 100`
    );
    res.json({ adjustments: result.rows });
  } catch (error) {
    console.error('GetAdjustmentHistory error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Update reorder level ────────────────────────────
const updateReorderLevel = async (req, res) => {
  try {
    const { product_id, reorder_level } = req.body;

    if (!product_id || reorder_level === undefined) {
      return res.status(400).json({ 
        error: 'product_id and reorder_level are required.' 
      });
    }

    const result = await pool.query(
      `UPDATE inventory SET reorder_level = $1
       WHERE product_id = $2
       RETURNING *`,
      [reorder_level, product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product inventory not found.' });
    }

    res.json({ 
      message: 'Reorder level updated.',
      inventory: result.rows[0] 
    });
  } catch (error) {
    console.error('UpdateReorderLevel error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getInventory, getLowStock, getExpiring,
  adjustStock, getAdjustmentHistory, updateReorderLevel
};