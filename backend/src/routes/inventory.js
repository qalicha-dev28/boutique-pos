const express = require('express');
const router = express.Router();
const {
  getInventory, getLowStock, getExpiring,
  adjustStock, getAdjustmentHistory, updateReorderLevel
} = require('../controllers/inventory');
const { protect, checkRole } = require('../middleware/auth');

// ── Inventory Routes ────────────────────────────────
router.get('/', protect, getInventory);
router.get('/low-stock', protect, getLowStock);
router.get('/expiring', protect, getExpiring);
router.get('/adjustments', protect, getAdjustmentHistory);
router.post('/adjust', protect, checkRole('admin', 'manager', 'stock_controller'), adjustStock);
router.put('/reorder-level', protect, checkRole('admin', 'manager'), updateReorderLevel);

module.exports = router;
