const Service = require('../models/Service');

function serializeService(doc) {
  const service = doc.toObject({ versionKey: false });
  service.id = service._id;
  delete service._id;

  if (service.serviceCenter && service.serviceCenter._id) {
    service.serviceCenter.id = service.serviceCenter._id;
    delete service.serviceCenter._id;
  }

  return service;
}

async function getServices(req, res) {
  try {
    const filter = {};
    const targetCenter = req.user?.serviceCenter || req.query.centerId || req.query.serviceCenterId;

    if (targetCenter) {
      filter.serviceCenter = targetCenter;
    }

    const services = await Service.find(filter).populate('serviceCenter', 'name address').sort({ createdAt: -1 });
    return res.status(200).json({ services: services.map(serializeService) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createServiceHandler(req, res) {
  const { name, description, duration, basePrice, vehicleType, category, serviceCenter } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  const targetCenter = req.user?.serviceCenter || serviceCenter || null;

  try {
    const service = await Service.create({
      name,
      description,
      duration,
      basePrice,
      vehicleType: vehicleType || 'All',
      category: category || 'General',
      serviceCenter: targetCenter
    });
    return res.status(201).json({ service: serializeService(service) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateServiceHandler(req, res) {
  const { id } = req.params;
  const { name, description, duration, basePrice, vehicleType, category } = req.body || {};

  const queryFilter = { _id: id };
  if (req.user?.serviceCenter) {
    queryFilter.serviceCenter = req.user.serviceCenter;
  }

  const updateDoc = {};
  if (name !== undefined) updateDoc.name = name;
  if (description !== undefined) updateDoc.description = description;
  if (duration !== undefined) updateDoc.duration = duration;
  if (basePrice !== undefined) updateDoc.basePrice = basePrice;
  if (vehicleType !== undefined) updateDoc.vehicleType = vehicleType;
  if (category !== undefined) updateDoc.category = category;

  try {
    const service = await Service.findOneAndUpdate(queryFilter, updateDoc, {
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

async function deleteServiceHandler(req, res) {
  const { id } = req.params;
  const queryFilter = { _id: id };
  if (req.user?.serviceCenter) {
    queryFilter.serviceCenter = req.user.serviceCenter;
  }

  try {
    const service = await Service.findOneAndDelete(queryFilter);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getServices,
  createService: createServiceHandler,
  updateService: updateServiceHandler,
  deleteService: deleteServiceHandler
};
