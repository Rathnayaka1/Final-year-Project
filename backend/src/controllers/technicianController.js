const Technician = require('../models/Technician');
const { spawn } = require('child_process');
const path = require('path');

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

function predictPerformance(req, res) {
  const inputData = JSON.stringify(req.body);
  const scriptPath = path.join(process.cwd(), 'scripts', 'predict.py');

  const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
  const python = spawn(pythonCmd, [scriptPath, inputData]);

  let result = '';
  let errorOutput = '';

  python.on('error', (err) => {
    console.error('Failed to start python process:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to start prediction script', details: err.message });
    }
  });

  python.stdout.on('data', (data) => { result += data.toString(); });
  python.stderr.on('data', (data) => { errorOutput += data.toString(); });

  python.on('close', (code) => {
    if (res.headersSent) return;
    if (code !== 0) {
      console.error('Python error:', errorOutput);
      return res.status(500).json({ error: 'Prediction failed', details: errorOutput });
    }
    try {
      return res.status(200).json(JSON.parse(result));
    } catch (err) {
      return res.status(500).json({ error: 'Invalid prediction output', raw: result });
    }
  });
}

async function getAvailableTechnicians(req, res) {
  try {
    const { centerId, vehicleType = 'Car', serviceType = 'Full Body', expectedTime = 2.0 } = req.query;
    if (!centerId) return res.status(400).json({ error: 'centerId is required' });

    const technicians = await Technician.find({ serviceCenter: centerId, status: 'active' });
    if (technicians.length === 0) {
      return res.status(200).json({ technicians: [] });
    }

    const currentMonth = new Date().getMonth() + 1;
    const ServiceCenter = require('../models/ServiceCenter');
    const center = await ServiceCenter.findById(centerId);
    const centerCode = center ? (center.name.includes('1') ? 'SC001' : 'SC002') : 'SC001';

    // Prepare data for ML Model
    const mlPayload = technicians.map((tech, index) => ({
      center_id: centerCode,
      technician_id: `tec_0${(index % 3) + 1}`, // map to ML known ID
      vehicle_type: vehicleType,
      service_type: serviceType,
      month: currentMonth,
      experience_years: tech.experienceYears || 0,
      job_count: tech.totalJobs || 0,
      work_success_rate: tech.successRate || 100,
      customer_rating: tech.averageRating || 4.0,
      expected_time_hrs: Number(expectedTime)
    }));

    const inputData = JSON.stringify(mlPayload);
    const scriptPath = path.join(process.cwd(), 'scripts', 'predict.py');
    const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';
    
    const python = spawn(pythonCmd, [scriptPath, inputData]);
    let result = '';
    
    python.stdout.on('data', (data) => { result += data.toString(); });
    python.on('close', (code) => {
      let predictions = [];
      if (code === 0) {
        try {
          predictions = JSON.parse(result);
        } catch (e) {
          console.error('Failed to parse ML output', e);
        }
      }

      const formattedTechs = technicians.map((tech, index) => {
        const serialized = serializeTechnician(tech);
        serialized.mlPrediction = predictions[index]?.predicted_performance_level || 'Normal';
        return serialized;
      });

      return res.status(200).json({ technicians: formattedTechs });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  predictPerformance,
  getAvailableTechnicians
};
