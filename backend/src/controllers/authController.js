const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_EXPIRY = '8h';

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).populate('serviceCenter', 'name');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const serviceCenterId = user.serviceCenter ? (user.serviceCenter._id || user.serviceCenter).toString() : null;
    const serviceCenterName = user.serviceCenter?.name || null;

    const payload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      serviceCenter: serviceCenterId,
      serviceCenterName
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: TOKEN_EXPIRY
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceCenter: serviceCenterId,
        serviceCenterName
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

const ServiceCenter = require('../models/ServiceCenter');
const Service = require('../models/Service');

async function registerCenter(req, res) {
  const { centerName, name, email, password } = req.body || {};

  if (!centerName || !email || !password) {
    return res.status(400).json({ error: 'Service Center Name, Email, and Password are required' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // 1. Create the new Service Center
    const serviceCenter = await ServiceCenter.create({
      name: centerName.trim(),
      address: `${centerName.trim()} Main Workshop`,
      location: { type: 'Point', coordinates: [80.2167, 6.9271] },
      phone: '+94110000000',
      email: email.toLowerCase().trim(),
      operatingHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: { open: '', close: '' }
      },
      facilities: ['Waiting Lounge', 'Certified Technicians']
    });

    // 2. Create the Admin user for this Service Center
    const user = await User.create({
      name: name?.trim() || `${centerName.trim()} Admin`,
      email: email.toLowerCase().trim(),
      role: 'admin',
      passwordHash: bcrypt.hashSync(password, 10),
      serviceCenter: serviceCenter._id
    });

    // 3. Generate JWT Token
    const serviceCenterId = serviceCenter._id.toString();
    const serviceCenterName = serviceCenter.name;

    const payload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      serviceCenter: serviceCenterId,
      serviceCenterName
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
      expiresIn: TOKEN_EXPIRY
    });

    return res.status(201).json({
      message: 'Service Center and Admin registered successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceCenter: serviceCenterId,
        serviceCenterName
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getPublicServiceCenters(req, res) {
  try {
    const centers = await ServiceCenter.find({ isActive: true }).select('name address').sort({ name: 1 });
    return res.status(200).json({
      serviceCenters: centers.map(c => ({
        id: c._id.toString(),
        name: c.name,
        address: c.address
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  login,
  registerCenter,
  getPublicServiceCenters
};
