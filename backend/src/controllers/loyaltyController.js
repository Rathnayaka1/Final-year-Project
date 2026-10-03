const Customer = require('../models/Customer');

// GET /api/loyalty/:customerId — Get loyalty summary & transaction history
async function getLoyaltySummary(req, res) {
  try {
    const customer = await Customer.findById(req.params.customerId).select(
      'name phone loyaltyPoints loyaltyTransactions'
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json({
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
      loyaltyTransactions: customer.loyaltyTransactions
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/loyalty/:customerId/earn — Earn loyalty points
async function earnPoints(req, res) {
  const { points, note } = req.body;

  if (!points || points <= 0) {
    return res.status(400).json({ error: 'Points must be a positive number' });
  }

  try {
    const customer = await Customer.findById(req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    customer.loyaltyPoints += points;
    customer.loyaltyTransactions.push({
      type: 'earn',
      points,
      note: note || 'Points earned'
    });

    await customer.save();

    return res.status(200).json({
      message: 'Points earned successfully',
      loyaltyPoints: customer.loyaltyPoints,
      transaction: customer.loyaltyTransactions[customer.loyaltyTransactions.length - 1]
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/loyalty/:customerId/redeem — Redeem loyalty points
async function redeemPoints(req, res) {
  const { points, note } = req.body;

  if (!points || points <= 0) {
    return res.status(400).json({ error: 'Points must be a positive number' });
  }

  try {
    const customer = await Customer.findById(req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.loyaltyPoints < points) {
      return res.status(400).json({
        error: 'Insufficient loyalty points',
        available: customer.loyaltyPoints
      });
    }

    customer.loyaltyPoints -= points;
    customer.loyaltyTransactions.push({
      type: 'redeem',
      points,
      note: note || 'Points redeemed'
    });

    await customer.save();

    return res.status(200).json({
      message: 'Points redeemed successfully',
      loyaltyPoints: customer.loyaltyPoints,
      transaction: customer.loyaltyTransactions[customer.loyaltyTransactions.length - 1]
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/loyalty/:customerId/transaction/:transactionId — Update a transaction note (Admin)
async function updateTransaction(req, res) {
  const { customerId, transactionId } = req.params;
  const { note } = req.body;

  try {
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const transaction = customer.loyaltyTransactions.id(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (note !== undefined) transaction.note = note;

    await customer.save();

    return res.status(200).json({
      message: 'Transaction updated',
      transaction
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /api/loyalty/:customerId/transaction/:transactionId — Delete a transaction (Admin)
async function deleteTransaction(req, res) {
  const { customerId, transactionId } = req.params;

  try {
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const transaction = customer.loyaltyTransactions.id(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Reverse the points effect before deleting
    if (transaction.type === 'earn') {
      customer.loyaltyPoints -= transaction.points;
    } else if (transaction.type === 'redeem') {
      customer.loyaltyPoints += transaction.points;
    }

    transaction.deleteOne();
    await customer.save();

    return res.status(200).json({
      message: 'Transaction deleted and points adjusted',
      loyaltyPoints: customer.loyaltyPoints
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getLoyaltySummary,
  earnPoints,
  redeemPoints,
  updateTransaction,
  deleteTransaction
};
