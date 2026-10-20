const express = require('express');
const {
  getNearbyServiceCenters,
  listServiceCenters,
  getServiceCenter,
  createServiceCenter,
  updateServiceCenter
} = require('../controllers/serviceCenterController');
const { authenticate, optionalAuth, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/nearby', getNearbyServiceCenters);
router.get('/', optionalAuth, listServiceCenters);
router.get('/:id', getServiceCenter);
router.post('/', authenticate, requireAdmin, createServiceCenter);
router.patch('/:id', authenticate, requireAdmin, updateServiceCenter);

module.exports = router;
