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
    const technicians = await Technician.find().populate('serviceCenter', 'name address');
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

  try {
    const technician = await Technician.create({
      name,
      phone,
      email,
      specialization,
      experienceYears,
      status,
      serviceCenter: serviceCenter || null,
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

module.exports = {
  listTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician
};
