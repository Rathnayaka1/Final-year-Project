const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const OTP = require('../models/OTP');

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

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
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
  const { customerId, points: rawPoints, note } = req.body;
  const points = Number(rawPoints);
  const transactionNote = note || 'Points added by admin';

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

    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(points);
    if (!customer.loyaltyTransactions) {
      customer.loyaltyTransactions = [];
    }
    customer.loyaltyTransactions.push({
      type: 'earn',
      points: Math.floor(points),
      note: transactionNote
    });
    await customer.save();

    return res.status(200).json({
      loyaltyPoints: customer.loyaltyPoints,
      transactions: customer.loyaltyTransactions.slice(-20).reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function useLoyaltyPoints(req, res) {
  const { customerId, points: rawPoints, note } = req.body;
  const points = Number(rawPoints);
  const transactionNote = note || 'Points redeemed for discount';

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  if (!Number.isFinite(points) || points <= 0) {
    return res.status(400).json({ error: 'Points must be a positive number' });
  }

  // උපරිම පොයින්ට්ස් 10ක සීමාව (Max 10 points limit validation)
  if (points > 10) {
    return res.status(400).json({ error: 'You can only redeem a maximum of 10 points at a time' });
  }

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const redeemPoints = Math.floor(points);
    if ((customer.loyaltyPoints || 0) < redeemPoints) {
      return res.status(400).json({ error: 'Not enough loyalty points' });
    }

    // 1 point = LKR 50 discount calculation
    const discountAmount = redeemPoints * 50;

    customer.loyaltyPoints -= redeemPoints;
    if (!customer.loyaltyTransactions) {
      customer.loyaltyTransactions = [];
    }
    customer.loyaltyTransactions.push({
      type: 'redeem',
      points: redeemPoints,
      note: `${transactionNote} (Discount: LKR ${discountAmount})`
    });
    await customer.save();

    return res.status(200).json({
      success: true,
      loyaltyPoints: customer.loyaltyPoints,
      discountAmount: discountAmount, // බිල් එකෙන් අඩු කරගැනීමට ෆ්‍රන්ට්-එන්ඩ් එකට යවන ඩිස්කවුන්ට් අගය
      transactions: customer.loyaltyTransactions.slice(-20).reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function listCustomerLoyalty(req, res) {
  try {
    const customers = await Customer.find()
      .select('name email phone loyaltyPoints loyaltyTransactions createdAt')
      .sort({ loyaltyPoints: -1, createdAt: -1 });

    const rows = customers.map((customer) => ({
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints || 0,
      transactionCount: customer.loyaltyTransactions?.length || 0,
      lastTransactionAt:
        customer.loyaltyTransactions?.length > 0
          ? customer.loyaltyTransactions[customer.loyaltyTransactions.length - 1].createdAt
          : null
    }));

    return res.status(200).json({ customers: rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function requestPasswordReset(req, res) {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ phone, code, expiresAt });

    console.log(`Password reset OTP for ${phone}: ${code}`);

    return res.status(200).json({ 
      message: 'OTP sent successfully',
      otp: code 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function verifyResetOTP(req, res) {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and OTP code are required' });
  }

  try {
    const otpRecord = await OTP.findOne({
      phone,
      code,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const resetToken = jwt.sign(
      { phone, type: 'password_reset' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '15m' }
    );

    return res.status(200).json({ 
      message: 'OTP verified successfully',
      resetToken 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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

    const customer = await Customer.findOne({ phone: decoded.phone });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    customer.passwordHash = passwordHash;
    await customer.save();

    await OTP.deleteMany({ phone: decoded.phone, verified: true });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
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
  verifyResetOTP,
  resetPassword
};