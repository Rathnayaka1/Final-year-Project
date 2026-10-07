const express = require('express');
const {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment
} = require('../controllers/paymentController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, requireRole('admin', 'manager', 'cashier'), getPayments);
router.post('/', authenticate, requireRole('admin', 'manager', 'cashier'), createPayment);
router.patch('/:id', authenticate, requireRole('admin', 'manager', 'cashier'), updatePayment);
router.delete('/:id', authenticate, requireRole('admin', 'manager'), deletePayment);

module.exports = router;
