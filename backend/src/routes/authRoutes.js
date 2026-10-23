const express = require('express');
const { 
  login, 
  registerCenter, 
  getPublicServiceCenters,
  getCenterStaff,
  getStaff,
  createStaff,
  deleteStaff
} = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/register-center', registerCenter);
router.get('/centers', getPublicServiceCenters);
router.get('/centers/:centerId/staff', getCenterStaff);

// Authenticated staff management routes
router.get('/staff', authenticate, getStaff);
router.post('/staff', authenticate, requireAdmin, createStaff);
router.delete('/staff/:id', authenticate, requireAdmin, deleteStaff);

module.exports = router;
