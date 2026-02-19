const pool = require('../config/db');

// ── Create a new sale ───────────────────────────────
const createSale = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id, items, discount_amount,
      payment_method, amount_paid, session_id
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item.' });
    }
    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required.' });
    }

    // Start transaction
    await client.query('BEGIN');

    let subtotal = 0;
    const saleItems = [];

    // Process each item
    for (const item of items) {
      // Get product details
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: `Product not found: ${item.product_id}` 
        });
      }

      const product = productResult.rows[0];

      // Check stock
      const stockResult = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1',
        [item.product_id]
      );

      if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for: ${product.name}` 
        });
      }

      // Calculate item total
      const unitPrice = parseFloat(product.selling_price);
      const itemDiscount = item.discount || 0;
      const itemTotal = (unitPrice * item.quantity) - itemDiscount;
      subtotal += itemTotal;

      saleItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount: itemDiscount,
        total: itemTotal
      });

      // Deduct stock
      await client.query(
        `UPDATE inventory 
         SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Calculate totals
    const discount = discount_amount || 0;
    const taxableAmount = subtotal - discount;
    const taxAmount = taxableAmount * 0.16; // 16% VAT
    const total = taxableAmount + taxAmount;
    const change = amount_paid - total;

    // Create the sale record
    const saleResult = await client.query(
      `INSERT INTO sales 
       (customer_id, cashier_id, session_id, subtotal, discount_amount, 
        tax_amount, total, amount_paid, change_amount, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed')
       RETURNING *`,
      [
        customer_id || null,
        req.user.id,
        session_id || null,
        subtotal,
        discount,
        taxAmount,
        total,
        amount_paid,
        change > 0 ? change : 0,
        payment_method
      ]
    );

    const sale = saleResult.rows[0];

    // Insert sale items
    for (const item of saleItems) {
      await client.query(
        `INSERT INTO sale_items 
         (sale_id, product_id, variant_id, quantity, unit_price, discount, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [sale.id, item.product_id, item.variant_id,
         item.quantity, item.unit_price, item.discount, item.total]
      );
    }

    // Record payment
    await client.query(
      `INSERT INTO payments (sale_id, method, amount, status)
       VALUES ($1, $2, $3, 'completed')`,
      [sale.id, payment_method, amount_paid]
    );

    // Add loyalty points if customer exists (1 point per 100 KES)
    if (customer_id) {
      const pointsEarned = Math.floor(total / 100);
      await client.query(
        `UPDATE customers 
         SET loyalty_points = loyalty_points + $1,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [pointsEarned, customer_id]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sale completed successfully.',
      sale: {
        ...sale,
        items: saleItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CreateSale error:', error.message);
    res.status(500).json({ error: 'Server error during sale.' });
  } finally {
    client.release();
  }
};

// ── Get all sales ───────────────────────────────────
const getAllSales = async (req, res) => {
  try {
    const { from, to, cashier_id } = req.query;
    let query = `
      SELECT s.*, 
       u.name AS cashier_name,
       c.name AS customer_name,
       COUNT(si.id) AS items_count
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN sale_items si ON s.id = si.sale_id
       WHERE 1=1
    `;
    const params = [];

    if (from) {
      params.push(from);
      query += ` AND s.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND s.created_at <= $${params.length}`;
    }
    if (cashier_id) {
      params.push(cashier_id);
      query += ` AND s.cashier_id = $${params.length}`;
    }

    query += ' GROUP BY s.id, u.name, c.name ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ sales: result.rows });
  } catch (error) {
    console.error('GetAllSales error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get single sale ─────────────────────────────────
const getSale = async (req, res) => {
  try {
    const saleResult = await pool.query(
      `SELECT s.*, u.name AS cashier_name, c.name AS customer_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found.' });
    }

    const itemsResult = await pool.query(
      `SELECT si.*, p.name AS product_name, p.sku
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    res.json({
      sale: {
        ...saleResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('GetSale error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get today's summary ─────────────────────────────
const getTodaySummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
       COUNT(*) AS total_transactions,
       SUM(total) AS total_revenue,
       SUM(discount_amount) AS total_discounts,
       SUM(tax_amount) AS total_tax,
       AVG(total) AS average_sale
       FROM sales
       WHERE DATE(created_at) = CURRENT_DATE
       AND status = 'completed'`
    );

    const paymentBreakdown = await pool.query(
      `SELECT payment_method, COUNT(*) AS count, SUM(total) AS amount
       FROM sales
       WHERE DATE(created_at) = CURRENT_DATE
       AND status = 'completed'
       GROUP BY payment_method`
    );

    res.json({
      summary: result.rows[0],
      payment_breakdown: paymentBreakdown.rows
    });
  } catch (error) {
    console.error('GetTodaySummary error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Refund a sale ───────────────────────────────────
const refundSale = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const saleResult = await client.query(
      'SELECT * FROM sales WHERE id = $1',
      [req.params.id]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sale not found.' });
    }

    const sale = saleResult.rows[0];

    if (sale.status === 'refunded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sale already refunded.' });
    }

    // Get sale items to restore stock
    const itemsResult = await client.query(
      'SELECT * FROM sale_items WHERE sale_id = $1',
      [req.params.id]
    );

    // Restore stock for each item
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE inventory 
         SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Mark sale as refunded
    await client.query(
      `UPDATE sales SET status = 'refunded' WHERE id = $1`,
      [req.params.id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Sale refunded successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('RefundSale error:', error.message);
    res.status(500).json({ error: 'Server error during refund.' });
  } finally {
    client.release();
  }
};

module.exports = { createSale, getAllSales, getSale, getTodaySummary, refundSale };