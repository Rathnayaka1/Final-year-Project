const Stock = require('../models/Stock');

// GET /api/stocks — get all stocks
exports.getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ createdAt: -1 });
    res.status(200).json({ stocks });
  } catch (err) {
    console.error('getStocks error:', err);
    res.status(500).json({ error: 'Failed to fetch stocks', message: err.message });
  }
};

// POST /api/stocks — create a new stock item
exports.createStock = async (req, res) => {
  try {
    const { partName, partNumber, quantity, minQuantity, unitPrice, supplier } = req.body;

    if (!partName || !partNumber) {
      return res.status(400).json({ error: 'partName and partNumber are required' });
    }

    const stock = await Stock.create({
      partName,
      partNumber,
      quantity: Number(quantity) || 0,
      minQuantity: Number(minQuantity) || 10,
      unitPrice: Number(unitPrice) || 0,
      supplier: supplier || '',
    });

    res.status(201).json({ stock });
  } catch (err) {
    console.error('createStock error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Part number already exists' });
    }
    res.status(500).json({ error: 'Failed to create stock', message: err.message });
  }
};

// PATCH /api/stocks/:id — update a stock item
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { partName, partNumber, quantity, minQuantity, unitPrice, supplier } = req.body;

    const updateData = {};
    if (partName !== undefined) updateData.partName = partName;
    if (partNumber !== undefined) updateData.partNumber = partNumber;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (minQuantity !== undefined) updateData.minQuantity = Number(minQuantity);
    if (unitPrice !== undefined) updateData.unitPrice = Number(unitPrice);
    if (supplier !== undefined) updateData.supplier = supplier;

    const stock = await Stock.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    res.status(200).json({ stock });
  } catch (err) {
    console.error('updateStock error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Part number already exists' });
    }
    res.status(500).json({ error: 'Failed to update stock', message: err.message });
  }
};

// DELETE /api/stocks/:id — delete a stock item
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await Stock.findByIdAndDelete(id);

    if (!stock) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    res.status(200).json({ message: 'Stock item deleted successfully' });
  } catch (err) {
    console.error('deleteStock error:', err);
    res.status(500).json({ error: 'Failed to delete stock', message: err.message });
  }
};
