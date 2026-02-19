const pool = require('../config/db');

// ── Get all products ────────────────────────────────
const getAllProducts = async () => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name,
     i.quantity AS stock_quantity
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.is_active = true
     ORDER BY p.created_at DESC`
  );
  return result.rows;
};

// ── Get product by ID ───────────────────────────────
const getProductById = async (id) => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name,
     i.quantity AS stock_quantity,
     i.reorder_level, i.expiry_date
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0];
};

// ── Search products ─────────────────────────────────
const searchProducts = async (query) => {
  const result = await pool.query(
    `SELECT p.*, c.name AS category_name,
     i.quantity AS stock_quantity
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.is_active = true AND (
       p.name ILIKE $1 OR
       p.sku ILIKE $1 OR
       p.barcode ILIKE $1 OR
       c.name ILIKE $1
     )
     ORDER BY p.name ASC`,
    [`%${query}%`]
  );
  return result.rows;
};

// ── Create product ──────────────────────────────────
const createProduct = async (data) => {
  const {
    name, sku, barcode, category_id,
    description, cost_price, selling_price,
    tax_rate, image_url
  } = data;

  const result = await pool.query(
    `INSERT INTO products 
     (name, sku, barcode, category_id, description, 
      cost_price, selling_price, tax_rate, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [name, sku, barcode, category_id, description,
     cost_price, selling_price, tax_rate, image_url]
  );
  return result.rows[0];
};

// ── Update product ──────────────────────────────────
const updateProduct = async (id, data) => {
  const {
    name, sku, barcode, category_id,
    description, cost_price, selling_price,
    tax_rate, is_active
  } = data;

  const result = await pool.query(
    `UPDATE products SET
     name=$1, sku=$2, barcode=$3, category_id=$4,
     description=$5, cost_price=$6, selling_price=$7,
     tax_rate=$8, is_active=$9, updated_at=CURRENT_TIMESTAMP
     WHERE id=$10
     RETURNING *`,
    [name, sku, barcode, category_id, description,
     cost_price, selling_price, tax_rate, is_active, id]
  );
  return result.rows[0];
};

// ── Delete product (soft delete) ────────────────────
const deleteProduct = async (id) => {
  const result = await pool.query(
    `UPDATE products SET is_active = false
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};

// ── Get low stock products ──────────────────────────
const getLowStockProducts = async () => {
  const result = await pool.query(
    `SELECT p.name, p.sku, i.quantity, i.reorder_level
     FROM products p
     JOIN inventory i ON p.id = i.product_id
     WHERE i.quantity <= i.reorder_level
     AND p.is_active = true
     ORDER BY i.quantity ASC`
  );
  return result.rows;
};

module.exports = {
  getAllProducts, getProductById, searchProducts,
  createProduct, updateProduct, deleteProduct,
  getLowStockProducts
};