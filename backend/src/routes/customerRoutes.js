const express = require('express');
const {
  register,
  loginCustomer,
  getProfile,
  updateProfile,
  getLoyaltySummary,
  addLoyaltyPoints,
  useLoyaltyPoints,
  listCustomerLoyalty,
  requestPasswordReset,
  verifyResetOTP,
  resetPassword
} = require('../controllers/customerController');
const { authenticate, requireAdmin, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginCustomer);
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.get('/loyalty', authenticate, getLoyaltySummary);

// මෙන්න මේ ලයින් දෙක වෙනස් කර ඇත (Admin, Manager සහ Receptionist යන අයට දැන් අවසර ඇත)
router.post('/loyalty/add', authenticate, requireRole('admin', 'manager', 'receptionist'), addLoyaltyPoints);
router.post('/loyalty/use', authenticate, requireRole('admin', 'manager', 'receptionist'), useLoyaltyPoints);

router.get('/admin/loyalty', authenticate, requireRole('admin', 'manager', 'receptionist'), listCustomerLoyalty);
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

module.exports = router;