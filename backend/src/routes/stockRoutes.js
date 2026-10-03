const express = require('express');
const router = express.Router();
const {
  getStocks,
  createStock,
  updateStock,
  deleteStock,
} = require('../controllers/stockController');

// GET /api/stocks
router.get('/', getStocks);

// POST /api/stocks
router.post('/', createStock);

// PATCH /api/stocks/:id
router.patch('/:id', updateStock);

// DELETE /api/stocks/:id
router.delete('/:id', deleteStock);

module.exports = router;
