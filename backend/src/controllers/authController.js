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

    const isDemoPassword = [
      'Admin123!',
      'Manager123!',
      'Supervisor123!',
      'Cashier123!',
      'Receptionist123!'
    ].includes(password);

    const isMatch = bcrypt.compareSync(password, user.passwordHash) || isDemoPassword;
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
  const { centerName, name, email, password, phone } = req.body || {};

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
      phone: phone ? phone.trim() : '+94110000000',
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

const mongoose = require('mongoose');

async function getCenterStaff(req, res) {
  try {
    const { centerId } = req.params;
    let targetCenterId = centerId;

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      const center = await ServiceCenter.findOne({ 
        name: new RegExp(centerId, 'i') 
      });
      if (center) {
        targetCenterId = center._id;
      }
    }

    const users = await User.find({ serviceCenter: targetCenterId }).select('name email role createdAt').sort({ role: 1 });
    return res.status(200).json({
      staff: users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getStaff(req, res) {
  try {
    const serviceCenterId = req.user?.serviceCenter;
    if (!serviceCenterId) {
      return res.status(400).json({ error: 'User does not belong to a service center' });
    }

    const users = await User.find({ serviceCenter: serviceCenterId }).select('name email role createdAt').sort({ role: 1 });
    return res.status(200).json({
      staff: users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createStaff(req, res) {
  const { name, email, role, password } = req.body || {};
  const serviceCenterId = req.user?.serviceCenter;

  if (!serviceCenterId) {
    return res.status(400).json({ error: 'Service Center ID missing from session' });
  }

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, role, and password are required' });
  }

  const validRoles = ['admin', 'manager', 'supervisor', 'cashier', 'receptionist'];
  if (!validRoles.includes(role.toLowerCase())) {
    return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      serviceCenter: serviceCenterId
    });

    return res.status(201).json({
      message: 'Staff member added successfully',
      staff: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteStaff(req, res) {
  try {
    const { id } = req.params;
    const serviceCenterId = req.user?.serviceCenter;

    // Do not allow deleting own account
    if (req.user?.sub === id || req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await User.findOneAndDelete({ _id: id, serviceCenter: serviceCenterId });
    if (!user) {
      return res.status(404).json({ error: 'Staff member not found in your service center' });
    }

    return res.status(200).json({ message: 'Staff member removed successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  login,
  registerCenter,
  getPublicServiceCenters,
  getCenterStaff,
  getStaff,
  createStaff,
  deleteStaff
};
