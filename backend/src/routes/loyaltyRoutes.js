const express = require('express');
const {
  getLoyaltySummary,
  earnPoints,
  redeemPoints,
  updateTransaction,
  deleteTransaction
} = require('../controllers/loyaltyController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// GET    /api/loyalty/:customerId              — Get points balance & history (authenticated)
router.get('/:customerId', authenticate, getLoyaltySummary);

// POST   /api/loyalty/:customerId/earn         — Earn points (admin only)
router.post('/:customerId/earn', authenticate, requireAdmin, earnPoints);

// POST   /api/loyalty/:customerId/redeem       — Redeem points (authenticated)
router.post('/:customerId/redeem', authenticate, redeemPoints);

// PATCH  /api/loyalty/:customerId/transaction/:transactionId — Update transaction note (admin)
router.patch('/:customerId/transaction/:transactionId', authenticate, requireAdmin, updateTransaction);

// DELETE /api/loyalty/:customerId/transaction/:transactionId — Delete transaction (admin)
router.delete('/:customerId/transaction/:transactionId', authenticate, requireAdmin, deleteTransaction);

module.exports = router;
