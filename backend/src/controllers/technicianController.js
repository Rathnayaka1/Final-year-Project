const Technician = require('../models/Technician');
function serializeTechnician(doc) {
  const technician = doc.toObject({ versionKey: false });
  technician.id = technician._id;
  delete technician._id;

  if (technician.serviceCenter && technician.serviceCenter._id) {
    technician.serviceCenter.id = technician.serviceCenter._id;
    delete technician.serviceCenter._id;
  }

  return technician;
}

async function listTechnicians(req, res) {
  try {
    const filter = {};
    if (req.user?.serviceCenter) {
      filter.serviceCenter = req.user.serviceCenter;
    } else if (req.query.serviceCenterId) {
      filter.serviceCenter = req.query.serviceCenterId;
    }

    const technicians = await Technician.find(filter).populate('serviceCenter', 'name address');
    return res.status(200).json({ technicians: technicians.map(serializeTechnician) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createTechnician(req, res) {
  const {
    name,
    phone,
    email,
    specialization,
    experienceYears,
    status,
    serviceCenter,
    skills,
    notes
  } = req.body || {};

  if (!name || !phone || !specialization) {
    return res.status(400).json({ error: 'Name, phone, and specialization are required' });
  }

  const targetCenter = req.user?.serviceCenter || serviceCenter || null;

  try {
    const technician = await Technician.create({
      name,
      phone,
      email,
      specialization,
      experienceYears,
      status,
      serviceCenter: targetCenter,
      skills: Array.isArray(skills)
        ? skills
        : typeof skills === 'string' && skills.trim()
          ? skills.split(',').map((skill) => skill.trim()).filter(Boolean)
          : [],
      notes
    });

    const populated = await Technician.findById(technician._id).populate('serviceCenter', 'name address');
    return res.status(201).json({ technician: serializeTechnician(populated) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateTechnician(req, res) {
  const { id } = req.params;
  const update = { ...req.body };

  if (update.skills !== undefined && !Array.isArray(update.skills)) {
    update.skills = typeof update.skills === 'string' && update.skills.trim()
      ? update.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
      : [];
  }

  try {
    const technician = await Technician.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    }).populate('serviceCenter', 'name address');

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    return res.status(200).json({ technician: serializeTechnician(technician) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function deleteTechnician(req, res) {
  try {
    const technician = await Technician.findByIdAndDelete(req.params.id);
    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    return res.status(200).json({ message: 'Technician deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

const { predictTechnicianPerformance } = require('../services/technicianperformance');

async function getAvailableTechnicians(req, res) {
  try {
    const { centerId, serviceCenterId, vehicleType, serviceType } = req.query || {};
    const targetCenterId = req.user?.serviceCenter || centerId || serviceCenterId;

    let query = { status: 'active' };
    if (targetCenterId) {
      query.$or = [{ serviceCenter: targetCenterId }, { serviceCenter: null }];
    }

    const technicians = await Technician.find(query).populate('serviceCenter', 'name address');
    const serialized = technicians.map(serializeTechnician);

    // Apply AI Performance model predictions
    const enriched = await predictTechnicianPerformance(
      serialized,
      vehicleType || 'Car',
      serviceType || 'Interior'
    );

    return res.status(200).json({ technicians: enriched });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function predictTechniciansEndpoint(req, res) {
  try {
    const { technicians, vehicleType, serviceType } = req.body || {};
    const predictions = await predictTechnicianPerformance(
      technicians || [],
      vehicleType || 'Car',
      serviceType || 'Interior'
    );
    return res.status(200).json({ technicians: predictions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function rateTechnician(req, res) {
  try {
    const { id } = req.params;
    const { rating } = req.body || {};
    const numRating = Number(rating);

    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    const tech = await Technician.findById(id);
    if (!tech) return res.status(404).json({ error: 'Technician not found' });

    const oldCount = tech.totalRatings || 0;
    const oldAvg = tech.averageRating || 4.0;
    const newCount = oldCount + 1;
    const newAvg = Number((((oldAvg * oldCount) + numRating) / newCount).toFixed(2));

    tech.totalRatings = newCount;
    tech.averageRating = newAvg;
    await tech.save();

    const populated = await Technician.findById(tech._id).populate('serviceCenter', 'name address');

    return res.status(200).json({
      message: 'Rating recorded successfully',
      averageRating: tech.averageRating,
      totalRatings: tech.totalRatings,
      technician: serializeTechnician(populated)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listTechnicians,
  getAvailableTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  predictTechniciansEndpoint,
  rateTechnician
};
