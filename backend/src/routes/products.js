const express = require('express');
const router = express.Router();
const {
  getAll, getOne, search, create,
  update, remove, lowStock,
  getCategories, createCategory
} = require('../controllers/products');
const { protect, checkRole } = require('../middleware/auth');

// ── Categories Routes ───────────────────────────────
router.get('/categories', protect, getCategories);
router.post('/categories', protect, checkRole('admin', 'manager'), createCategory);

// ── Products Routes ─────────────────────────────────
router.get('/search', protect, search);
router.get('/low-stock', protect, lowStock);
router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.post('/', protect, checkRole('admin', 'manager', 'stock_controller'), create);
router.put('/:id', protect, checkRole('admin', 'manager', 'stock_controller'), update);
router.delete('/:id', protect, checkRole('admin', 'manager'), remove);

module.exports = router;