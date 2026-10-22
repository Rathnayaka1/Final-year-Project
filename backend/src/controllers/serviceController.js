const Service = require('../models/Service');

function serializeService(doc) {
  if (!doc) return null;
  const service = doc.toObject ? doc.toObject({ versionKey: false }) : { ...doc };
  service.id = (service._id || service.id)?.toString();
  delete service._id;

  if (service.serviceCenter) {
    if (typeof service.serviceCenter === 'object' && service.serviceCenter._id) {
      service.serviceCenter.id = service.serviceCenter._id.toString();
      delete service.serviceCenter._id;
    } else if (typeof service.serviceCenter === 'object' && typeof service.serviceCenter.toString === 'function') {
      service.serviceCenter = service.serviceCenter.toString();
    }
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

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  const targetCenter = req.user?.serviceCenter || serviceCenter || null;
  const cleanName = name.trim();
  const targetVehicleType = vehicleType || 'All';

  try {
    // Check for duplicate: same service name + same vehicle type within the same service center
    const duplicateFilter = {
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      vehicleType: targetVehicleType,
      serviceCenter: targetCenter
    };
    const existing = await Service.findOne(duplicateFilter);
    if (existing) {
      return res.status(400).json({ error: `A service named "${cleanName}" already exists in your catalog for vehicle type "${targetVehicleType}".` });
    }

    const serviceDoc = await Service.create({
      name: cleanName,
      description: description || '',
      duration: Number(duration) || 30,
      basePrice: Number(basePrice) || 0,
      vehicleType: targetVehicleType,
      category: category || 'General',
      serviceCenter: targetCenter
    });

    const populated = await Service.findById(serviceDoc._id).populate('serviceCenter', 'name address');
    return res.status(201).json({ service: serializeService(populated || serviceDoc) });
  } catch (error) {
    console.error('Error creating service:', error);
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
  if (name !== undefined) updateDoc.name = name.trim();
  if (description !== undefined) updateDoc.description = description;
  if (duration !== undefined) updateDoc.duration = Number(duration) || 30;
  if (basePrice !== undefined) updateDoc.basePrice = Number(basePrice) || 0;
  if (vehicleType !== undefined) updateDoc.vehicleType = vehicleType;
  if (category !== undefined) updateDoc.category = category;

  try {
    if (updateDoc.name || updateDoc.vehicleType) {
      // Fetch current doc to get existing vehicleType if not being updated
      const currentService = await Service.findById(id).lean();
      const checkVehicleType = updateDoc.vehicleType || currentService?.vehicleType || 'All';
      const checkName = updateDoc.name || currentService?.name || '';
      const duplicateFilter = {
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${checkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        vehicleType: checkVehicleType,
        serviceCenter: req.user?.serviceCenter || null
      };
      const existing = await Service.findOne(duplicateFilter);
      if (existing) {
        return res.status(400).json({ error: `A service named "${checkName}" already exists for vehicle type "${checkVehicleType}" in this service center.` });
      }
    }

    const service = await Service.findOneAndUpdate(queryFilter, updateDoc, {
      new: true,
      runValidators: true
    }).populate('serviceCenter', 'name address');

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json({ service: serializeService(service) });
  } catch (error) {
    console.error('Error updating service:', error);
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

