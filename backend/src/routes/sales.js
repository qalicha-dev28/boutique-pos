const express = require('express');
const router = express.Router();
const {
  createSale, getAllSales, getSale,
  getTodaySummary, refundSale
} = require('../controllers/sales');
const { protect, checkRole } = require('../middleware/auth');

// ── Sales Routes ────────────────────────────────────
router.get('/summary/today', protect, getTodaySummary);
router.get('/', protect, getAllSales);
router.get('/:id', protect, getSale);
router.post('/', protect, checkRole('admin', 'manager', 'cashier'), createSale);
router.post('/:id/refund', protect, checkRole('admin', 'manager'), refundSale);

module.exports = router;