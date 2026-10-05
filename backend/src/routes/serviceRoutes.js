const express = require('express');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getServices);
router.post('/', authenticate, requireAdmin, createService);
router.patch('/:id', authenticate, requireAdmin, updateService);
router.delete('/:id', authenticate, requireAdmin, deleteService);

module.exports = router;
