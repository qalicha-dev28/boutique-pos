const {
  getAllProducts, getProductById, searchProducts,
  createProduct, updateProduct, deleteProduct,
  getLowStockProducts
} = require('../models/product');
const pool = require('../config/db');

// ── Get all products ────────────────────────────────
const getAll = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ products });
  } catch (error) {
    console.error('GetAll products error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get single product ──────────────────────────────
const getOne = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product });
  } catch (error) {
    console.error('GetOne product error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Search products ─────────────────────────────────
const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const products = await searchProducts(q);
    res.json({ products });
  } catch (error) {
    console.error('Search products error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Create product ──────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      name, sku, barcode, category_id,
      description, cost_price, selling_price,
      tax_rate, image_url, initial_stock,
      reorder_level, expiry_date
    } = req.body;

    // Validate required fields
    if (!name || !selling_price) {
      return res.status(400).json({ 
        error: 'Product name and selling price are required.' 
      });
    }

    // Create the product
    const product = await createProduct({
      name, sku, barcode, category_id,
      description, cost_price: cost_price || 0,
      selling_price, tax_rate: tax_rate || 0,
      image_url
    });

    // Create inventory record for this product
    await pool.query(
      `INSERT INTO inventory 
       (product_id, quantity, reorder_level, expiry_date)
       VALUES ($1, $2, $3, $4)`,
      [
        product.id,
        initial_stock || 0,
        reorder_level || 10,
        expiry_date || null
      ]
    );

    res.status(201).json({
      message: 'Product created successfully.',
      product
    });

  } catch (error) {
    console.error('Create product error:', error.message);
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({ 
        error: 'SKU or barcode already exists.' 
      });
    }
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Update product ──────────────────────────────────
const update = async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Delete product ──────────────────────────────────
const remove = async (req, res) => {
  try {
    const product = await deleteProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get low stock ───────────────────────────────────
const lowStock = async (req, res) => {
  try {
    const products = await getLowStockProducts();
    res.json({ products });
  } catch (error) {
    console.error('Low stock error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Get all categories ──────────────────────────────
const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('GetCategories error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── Create category ─────────────────────────────────
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const result = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    res.status(201).json({
      message: 'Category created successfully.',
      category: result.rows[0]
    });
  } catch (error) {
    console.error('CreateCategory error:', error.message);
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({ error: 'Category already exists.' });
    }
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getAll, getOne, search, create,
  update, remove, lowStock,
  getCategories, createCategory
};