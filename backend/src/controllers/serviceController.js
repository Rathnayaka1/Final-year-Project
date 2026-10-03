const Service = require('../models/Service');

function serializeService(doc) {
  const service = doc.toObject({ versionKey: false });
  service.id = service._id;
  delete service._id;
  return service;
}

async function getServices(req, res) {
  const services = await Service.find().sort({ createdAt: -1 });
  return res.status(200).json({ services: services.map(serializeService) });
}

async function createServiceHandler(req, res) {
  const { name, description, duration, basePrice } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  try {
    const service = await Service.create({
      name,
      description,
      duration,
      basePrice
    });
    return res.status(201).json({ service: serializeService(service) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateServiceHandler(req, res) {
  const { id } = req.params;
  const { name, description, duration, basePrice } = req.body || {};

  const updateDoc = {};
  if (name !== undefined) updateDoc.name = name;
  if (description !== undefined) updateDoc.description = description;
  if (duration !== undefined) updateDoc.duration = duration;
  if (basePrice !== undefined) updateDoc.basePrice = basePrice;

  try {
    const service = await Service.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json({ service: serializeService(service) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getServices,
  createService: createServiceHandler,
  updateService: updateServiceHandler
};
