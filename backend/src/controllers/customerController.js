const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const TOKEN_EXPIRY = '30d';

function toPublicCustomer(customer) {
  return {
    id: customer._id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    username: customer.username,
    profileImage: customer.profileImage,
    loyaltyPoints: customer.loyaltyPoints || 0
  };
}

async function register(req, res) {
  const { name, email, phone, username, password } = req.body;

  if (!name || !phone || !username) {
    return res.status(400).json({ error: 'Name, username and phone are required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    if (username) {
      const existingUsername = await Customer.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const customer = await Customer.create({
      name,
      email,
      phone,
      username: username ? username.toLowerCase() : undefined,
      passwordHash,
      isVerified: true
    });

    const token = jwt.sign(
      { sub: customer._id, role: 'customer', phone: customer.phone },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.status(201).json({
      token,
      customer: toPublicCustomer(customer)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function loginCustomer(req, res) {
  const { identifier, password } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'Username or phone number is required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    // Try to find customer by phone or username
    const customer = await Customer.findOne({
      $or: [
        { phone: identifier },
        { username: identifier.toLowerCase() }
      ]
    });

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!customer.passwordHash) {
      return res.status(401).json({ error: 'Password not set for this account' });
    }

    const isMatch = bcrypt.compareSync(password, customer.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: customer._id, role: 'customer', phone: customer.phone },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.status(200).json({
      token,
      customer: toPublicCustomer(customer)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getProfile(req, res) {
  try {
    const customer = await Customer.findById(req.user.sub).select('-passwordHash');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json({ customer: toPublicCustomer(customer) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateProfile(req, res) {
  const { name, email, profileImage } = req.body;

  try {
    const customer = await Customer.findByIdAndUpdate(
      req.user.sub,
      { name, email, profileImage },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    return res.status(200).json({ customer: toPublicCustomer(customer) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getLoyaltySummary(req, res) {
  try {
    const customer = await Customer.findById(req.user.sub).select('loyaltyPoints loyaltyTransactions');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(200).json({
      loyaltyPoints: customer.loyaltyPoints || 0,
      transactions: (customer.loyaltyTransactions || []).slice(-20).reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function addLoyaltyPoints(req, res) {
  const { customerId, points: rawPoints, note, serviceCenterId } = req.body;
  const points = Number(rawPoints);
  const transactionNote = note || 'Points added by admin';
  const targetCenter = req.user?.serviceCenter || serviceCenterId || null;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  if (!Number.isFinite(points) || points <= 0) {
    return res.status(400).json({ error: 'Points must be a positive number' });
  }

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!customer.branchLoyalty) {
      customer.branchLoyalty = [];
    }

    let branchPoints = Math.floor(points);
    if (targetCenter) {
      let branchRec = customer.branchLoyalty.find(
        b => b.serviceCenter && b.serviceCenter.toString() === targetCenter.toString()
      );
      if (!branchRec) {
        branchRec = { serviceCenter: targetCenter, points: 0 };
        customer.branchLoyalty.push(branchRec);
      }
      branchRec.points = Math.max(0, (branchRec.points || 0) + Math.floor(points));
      branchPoints = branchRec.points;
    }

    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(points);
    if (!customer.loyaltyTransactions) {
      customer.loyaltyTransactions = [];
    }
    customer.loyaltyTransactions.push({
      type: 'earn',
      points: Math.floor(points),
      serviceCenter: targetCenter,
      note: transactionNote
    });
    await customer.save();

    return res.status(200).json({
      loyaltyPoints: targetCenter ? branchPoints : customer.loyaltyPoints,
      transactions: customer.loyaltyTransactions.slice(-20).reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function useLoyaltyPoints(req, res) {
  const { customerId, points: rawPoints, note, pendingEarnedPoints, serviceCenterId } = req.body;
  const points = Number(rawPoints);
  const transactionNote = note || 'Points redeemed for discount';
  const targetCenter = req.user?.serviceCenter || serviceCenterId || null;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  if (!Number.isFinite(points) || points <= 0) {
    return res.status(400).json({ error: 'Points must be a positive number' });
  }

  if (points > 10) {
    return res.status(400).json({ error: 'You can only redeem a maximum of 10 points at a time' });
  }

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const redeemPoints = Math.floor(points);
    const pendingEarned = Number(pendingEarnedPoints || 0);

    let currentStored = Math.max(0, customer.loyaltyPoints || 0);
    let branchRec = null;

    if (targetCenter) {
      if (!customer.branchLoyalty) customer.branchLoyalty = [];
      branchRec = customer.branchLoyalty.find(
        b => b.serviceCenter && b.serviceCenter.toString() === targetCenter.toString()
      );
      currentStored = Math.max(0, branchRec ? branchRec.points : 0);
    }

    const totalAvailable = currentStored + pendingEarned;
    if (totalAvailable < redeemPoints) {
      return res.status(400).json({
        error: targetCenter
          ? `Not enough loyalty points at this service center (Available: ${currentStored} points).`
          : 'Not enough loyalty points'
      });
    }

    const discountAmount = redeemPoints * 50;

    if (targetCenter) {
      if (!branchRec) {
        branchRec = { serviceCenter: targetCenter, points: 0 };
        customer.branchLoyalty.push(branchRec);
      }
      branchRec.points = Math.max(0, currentStored + pendingEarned - redeemPoints);
    }

    customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + pendingEarned - redeemPoints);
    if (!customer.loyaltyTransactions) {
      customer.loyaltyTransactions = [];
    }
    customer.loyaltyTransactions.push({
      type: 'redeem',
      points: redeemPoints,
      serviceCenter: targetCenter,
      note: `${transactionNote} (Discount: LKR ${discountAmount})`
    });
    await customer.save();

    return res.status(200).json({
      success: true,
      loyaltyPoints: targetCenter && branchRec ? branchRec.points : customer.loyaltyPoints,
      discountAmount: discountAmount,
      transactions: customer.loyaltyTransactions.slice(-20).reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function listCustomerLoyalty(req, res) {
  try {
    const targetCenter = req.user?.serviceCenter || req.query.serviceCenterId || null;
    const customers = await Customer.find()
      .select('name email phone loyaltyPoints branchLoyalty loyaltyTransactions createdAt')
      .sort({ createdAt: -1 });

    const rows = [];
    for (const customer of customers) {
      let points = Math.max(0, customer.loyaltyPoints || 0);
      let transactions = customer.loyaltyTransactions || [];

      if (targetCenter) {
        const centerStr = targetCenter.toString();
        const branchRec = (customer.branchLoyalty || []).find(
          b => b.serviceCenter && b.serviceCenter.toString() === centerStr
        );
        const branchTx = transactions.filter(
          t => t.serviceCenter && t.serviceCenter.toString() === centerStr
        );
        const branchPoints = Math.max(0, branchRec ? branchRec.points : 0);

        if (branchPoints === 0 && branchTx.length === 0) {
          continue;
        }

        points = branchPoints;
        transactions = branchTx;
      }

      rows.push({
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        loyaltyPoints: points,
        transactionCount: transactions.length,
        transactions: transactions.slice(-5).map(t => ({
          ...(typeof t.toObject === 'function' ? t.toObject() : t),
          customerName: customer.name
        })),
        lastTransactionAt:
          transactions.length > 0
            ? transactions[transactions.length - 1].createdAt
            : null
      });
    }

    rows.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);
    return res.status(200).json({ customers: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// ─── Password Reset (Phone + Username Verification) ────────────────────────

async function requestPasswordReset(req, res) {
  const { phone } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const customer = await Customer.findOne({ phone: phone.trim() });
    if (!customer) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    // Return only confirmation that the account exists — no sensitive data
    return res.status(200).json({ message: 'Account found. Please verify your identity.' });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

async function verifyResetAccount(req, res) {
  const { phone, username } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Verify that phone and username belong to the SAME customer
    const customer = await Customer.findOne({
      phone: phone.trim(),
      username: username.trim().toLowerCase()
    });

    if (!customer) {
      return res.status(400).json({ error: 'The provided account details do not match' });
    }

    // Generate a short-lived password reset token
    const resetToken = jwt.sign(
      { sub: customer._id, type: 'password_reset' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      message: 'Account verified successfully',
      resetToken
    });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

async function resetPassword(req, res) {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'dev-secret');

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const customer = await Customer.findById(decoded.sub);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    customer.passwordHash = passwordHash;
    await customer.save();

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

// ─── List All Customers (for Payment form dropdown) ────────────────────────
async function listAllCustomers(req, res) {
  try {
    const customers = await Customer.find()
      .select('name email phone loyaltyPoints branchLoyalty')
      .sort({ name: 1 });

    const rows = customers.map(c => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints || 0,
      branchLoyalty: c.branchLoyalty || []
    }));

    return res.status(200).json({ customers: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  register,
  loginCustomer,
  getProfile,
  updateProfile,
  getLoyaltySummary,
  addLoyaltyPoints,
  useLoyaltyPoints,
  listCustomerLoyalty,
  requestPasswordReset,
  verifyResetAccount,
  resetPassword,
  listAllCustomers
};