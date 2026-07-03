const ServiceCenter = require('../models/ServiceCenter');

async function getNearbyServiceCenters(req, res) {
  const { lat, lng, maxDistance = 50000 } = req.query; // maxDistance in meters (default 50km)

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  try {
    const centers = await ServiceCenter.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).limit(20);

    const enriched = centers.map(center => {
      const obj = center.toObject();
      obj.id = obj._id;
      delete obj._id;
      obj.distance = calculateDistance(parseFloat(lat), parseFloat(lng), obj.location.coordinates[1], obj.location.coordinates[0]);
      return obj;
    });

    return res.status(200).json({ serviceCenters: enriched });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function listServiceCenters(req, res) {
  try {
    const centers = await ServiceCenter.find({ isActive: true }).sort({ name: 1 });
    const serialized = centers.map(center => {
      const obj = center.toObject();
      obj.id = obj._id;
      delete obj._id;
      return obj;
    });
    return res.status(200).json({ serviceCenters: serialized });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getServiceCenter(req, res) {
  try {
    const center = await ServiceCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ error: 'Service center not found' });
    }
    const obj = center.toObject();
    obj.id = obj._id;
    delete obj._id;
    return res.status(200).json({ serviceCenter: obj });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createServiceCenter(req, res) {
  const { name, address, coordinates, phone, email, operatingHours, facilities } = req.body;

  if (!name || !address || !coordinates || !phone) {
    return res.status(400).json({ error: 'Name, address, coordinates, and phone are required' });
  }

  try {
    const center = await ServiceCenter.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(coordinates.lng), parseFloat(coordinates.lat)]
      },
      phone,
      email,
      operatingHours,
      facilities: facilities || []
    });

    const obj = center.toObject();
    obj.id = obj._id;
    delete obj._id;
    return res.status(201).json({ serviceCenter: obj });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateServiceCenter(req, res) {
  const { id } = req.params;
  const { name, address, coordinates, phone, email, operatingHours, facilities, isActive } = req.body;

  try {
    const update = { name, address, phone, email, operatingHours, facilities, isActive };
    
    if (coordinates) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(coordinates.lng), parseFloat(coordinates.lat)]
      };
    }

    const center = await ServiceCenter.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    
    if (!center) {
      return res.status(404).json({ error: 'Service center not found' });
    }

    const obj = center.toObject();
    obj.id = obj._id;
    delete obj._id;
    return res.status(200).json({ serviceCenter: obj });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

module.exports = {
  getNearbyServiceCenters,
  listServiceCenters,
  getServiceCenter,
  createServiceCenter,
  updateServiceCenter
};
