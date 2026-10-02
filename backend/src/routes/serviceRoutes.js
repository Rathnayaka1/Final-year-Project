const express = require('express');
const { getServices, createService, updateService } = require('../controllers/serviceController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getServices);
router.post('/', authenticate, requireAdmin, createService);
router.patch('/:id', authenticate, requireAdmin, updateService);

module.exports = router;
