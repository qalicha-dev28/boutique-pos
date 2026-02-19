const express = require('express');
const router = express.Router();
const {
  getAll, getOne, search, create,
  update, addLoyaltyPoints, getPurchaseHistory
} = require('../controllers/customers');
const { protect, checkRole } = require('../middleware/auth');

// ── Customers Routes ────────────────────────────────
router.get('/search', protect, search);
router.get('/', protect, getAll);
router.get('/:id', protect, getOne);
router.get('/:id/purchases', protect, getPurchaseHistory);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.put('/:id/loyalty', protect, checkRole('admin', 'manager', 'cashier'), addLoyaltyPoints);

module.exports = router;