const express = require('express');
const router = express.Router();
const {
  getStocks,
  createStock,
  updateStock,
  deleteStock,
} = require('../controllers/stockController');

const { optionalAuth } = require('../middlewares/authMiddleware');

// GET /api/stocks
router.get('/', optionalAuth, getStocks);

// POST /api/stocks
router.post('/', optionalAuth, createStock);

// PATCH /api/stocks/:id
router.patch('/:id', optionalAuth, updateStock);

// DELETE /api/stocks/:id
router.delete('/:id', optionalAuth, deleteStock);

module.exports = router;
