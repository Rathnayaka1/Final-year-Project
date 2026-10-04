const Service = require('../models/Service');
const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const Technician = require('../models/Technician');
const { STATUS, QUEUE_STATUS } = require('../utils/constants');

const allowedStatuses = Object.values(STATUS);
const allowedQueueStatuses = Object.values(QUEUE_STATUS);

function normalizeCode(code) {
  return code?.trim().toUpperCase();
}

async function getNextQueueNumber() {
  try {
    const latest = await Appointment.findOne()
      .sort({ queueNumber: -1 })
      .select('queueNumber')
      .lean();
    return (latest?.queueNumber ?? 100) + 1;
  } catch (error) {
    console.error('Queue number error:', error);
    return 101;
  }
}

function serializeAppointment(doc) {
  if (!doc) return null;
  const appointment = doc.toObject({ versionKey: false });
  appointment.id = appointment._id;
  delete appointment._id;
  return appointment;
}

function calculateLoyaltyPoints(appointment) {
  const billAmount = Number(appointment.actualCost ?? appointment.estimatedCost ?? 0);
  if (!Number.isFinite(billAmount) || billAmount <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(billAmount / 100));
}

async function awardLoyaltyPointsForCompletion(appointment) {
  if (!appointment.customer) return 0;
  if (appointment.loyaltyPointsAwarded && appointment.loyaltyPointsAwarded > 0) {
    return appointment.loyaltyPointsAwarded;
  }

  const points = calculateLoyaltyPoints(appointment);
  const customer = await Customer.findById(appointment.customer);
  if (!customer) return 0;

  customer.loyaltyPoints = (customer.loyaltyPoints || 0) + points;
  customer.loyaltyTransactions.push({
    type: 'earn',
    points,
    note: `Auto-earned from completed service ${appointment.confirmationCode}`
  });
  await customer.save();

  appointment.loyaltyPointsAwarded = points;
  await appointment.save();

  return points;
}

async function createAppointmentHandler(req, res) {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      serviceCenterId,
      serviceId,
      preferredDate,
      preferredTime,
      vehicleLocation,
      notes,
      customerId,
      vehicleId,
      technicianId // <-- Added technicianId
    } = req.body || {};

    if (!customerName || !serviceCenterId || !serviceId || !preferredDate || !preferredTime) {
      return res.status(400).json({ error: 'Missing required appointment details' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const ServiceCenter = require('../models/ServiceCenter');
    const center = await ServiceCenter.findById(serviceCenterId);
    if (!center) {
      return res.status(404).json({ error: 'Service center not found' });
    }

    const queueNumber = await getNextQueueNumber();
    const confirmationCode = `APPT-${String(queueNumber).padStart(4, '0')}`;

    const appointmentData = {
      customerName,
      customerEmail,
      customerPhone,
      serviceCenter: center._id,
      service: service._id,
      serviceId: service._id.toString(),
      serviceName: service.name,
      preferredDate,
      preferredTime,
      vehicleLocation: vehicleLocation
        ? {
            label: vehicleLocation.label || '',
            latitude: Number(vehicleLocation.latitude),
            longitude: Number(vehicleLocation.longitude)
          }
        : undefined,
      notes,
      queueNumber,
      confirmationCode,
      estimatedCost: service.basePrice,
      estimatedDuration: service.duration
    };

    if (vehicleLocation) {
      const latitude = Number(vehicleLocation.latitude);
      const longitude = Number(vehicleLocation.longitude);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        appointmentData.vehicleLocation = {
          label: vehicleLocation.label || '',
          latitude,
          longitude
        };
      }
    }

    // Use authenticated customer ID if available, otherwise use provided customerId
    if (req.user?.sub && req.user?.role === 'customer') {
      appointmentData.customer = req.user.sub;
    } else if (customerId) {
      appointmentData.customer = customerId;
    }
    
    if (!appointmentData.customer && customerPhone) {
      const existingCustomer = await Customer.findOne({ phone: customerPhone }).select('_id');
      if (existingCustomer) {
        appointmentData.customer = existingCustomer._id;
      }
    }
    
    if (vehicleId) appointmentData.vehicle = vehicleId;
    if (technicianId) appointmentData.technician = technicianId; // <-- Save technician

    const appointment = await Appointment.create(appointmentData);

    // Update center queue
    await ServiceCenter.findByIdAndUpdate(center._id, {
      $inc: { currentQueueLength: 1 }
    });

    return res.status(201).json({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function listAppointmentsHandler(req, res) {
  try {
    const filter = req.query.centerId ? { serviceCenter: req.query.centerId } : {};
    const appointments = await Appointment.find(filter)
      .populate('serviceCenter', 'name address')
      .sort({ queueNumber: 1 });
    return res.status(200).json({ appointments: appointments.map(serializeAppointment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getCustomerAppointments(req, res) {
  try {
    const customerId = req.user.sub;
    const customerPhone = req.user.phone;

    const filters = [];
    if (customerId) filters.push({ customer: customerId });
    if (customerPhone) filters.push({ customerPhone });

    const matchCriteria = filters.length > 1 ? { $or: filters } : filters[0] || { _id: null };

    const appointments = await Appointment.find(matchCriteria)
      .populate('serviceCenter', 'name address phone')
      .populate('service', 'name duration basePrice')
      .sort({ createdAt: -1 });
    return res.status(200).json({ appointments: appointments.map(serializeAppointment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getActiveAppointment(req, res) {
  try {
    const customerId = req.user.sub;
    const appointment = await Appointment.findOne({
      customer: customerId,
      status: { $in: [STATUS.BOOKED, STATUS.IN_PROGRESS] }
    })
      .populate('serviceCenter', 'name address phone currentQueueLength averageWaitTime')
      .populate('service', 'name duration basePrice')
      .sort({ createdAt: -1 });
    
    if (!appointment) {
      return res.status(404).json({ error: 'No active appointment found' });
    }

    const serialized = serializeAppointment(appointment);
    
    // Calculate vehicles ahead in queue
    if (appointment.serviceCenter) {
      const vehiclesAhead = await Appointment.countDocuments({
        serviceCenter: appointment.serviceCenter._id,
        queueNumber: { $lt: appointment.queueNumber },
        status: { $in: [STATUS.BOOKED, STATUS.IN_PROGRESS] }
      });
      serialized.vehiclesAhead = vehiclesAhead;
      serialized.estimatedWaitTime = appointment.serviceCenter.averageWaitTime || 30;
    }

    return res.status(200).json({ appointment: serialized });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateAppointmentStatusHandler(req, res) {
  const { id } = req.params;
  const { status, queueStatus } = req.body || {};

  if (!status && !queueStatus) {
    return res.status(400).json({ error: 'Provide status or queueStatus to update' });
  }

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  if (queueStatus && !allowedQueueStatuses.includes(queueStatus)) {
    return res.status(400).json({ error: 'Invalid queue status' });
  }

  try {
    const existing = await Appointment.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const update = {};
    if (status) update.status = status;
    if (queueStatus) update.queueStatus = queueStatus;

    // Auto sync status and queueStatus when queue is moved to serving or completed
    if (queueStatus === QUEUE_STATUS.SERVING && status !== STATUS.COMPLETED && status !== STATUS.CANCELLED) {
      update.status = STATUS.IN_PROGRESS;
    }
    if (status === STATUS.IN_PROGRESS && !queueStatus) {
      update.queueStatus = QUEUE_STATUS.SERVING;
    }
    if (queueStatus === QUEUE_STATUS.COMPLETED && !status) {
      update.status = STATUS.COMPLETED;
    }
    if (status === STATUS.COMPLETED && !queueStatus) {
      update.queueStatus = QUEUE_STATUS.COMPLETED;
    }

    const effectiveStatus = update.status || existing.status;
    const effectiveQueueStatus = update.queueStatus || existing.queueStatus;

    // Record startedAt when queue becomes SERVING or status becomes IN_PROGRESS
    if ((effectiveQueueStatus === QUEUE_STATUS.SERVING || effectiveStatus === STATUS.IN_PROGRESS) && !existing.startedAt) {
      update.startedAt = new Date();
    }

    // Record completedAt and calculate actualDuration when COMPLETED
    if ((effectiveStatus === STATUS.COMPLETED || effectiveQueueStatus === QUEUE_STATUS.COMPLETED) && !existing.completedAt) {
      const completionDate = new Date();
      update.completedAt = completionDate;

      const startDate = existing.startedAt || update.startedAt || existing.createdAt || completionDate;
      const durationMs = completionDate - new Date(startDate);
      const durationHours = Math.max(0.1, Number((durationMs / (1000 * 60 * 60)).toFixed(2)));
      update.actualDuration = durationHours;
    }

    const updated = await Appointment.findByIdAndUpdate(id, update, { new: true });

    if (effectiveStatus === STATUS.COMPLETED && existing.status !== STATUS.COMPLETED) {
      await awardLoyaltyPointsForCompletion(updated);
      if (updated.technician) {
        await Technician.findByIdAndUpdate(updated.technician, { $inc: { totalJobs: 1 } });
      }
    }

    return res.status(200).json({ appointment: serializeAppointment(updated) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function lookupAppointmentHandler(req, res) {
  const { code } = req.params;
  const normalized = normalizeCode(code);

  if (!normalized) {
    return res.status(400).json({ error: 'Confirmation code is required' });
  }

  try {
    const appointment = await Appointment.findOne({ confirmationCode: normalized });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.status(200).json({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createAppointment: createAppointmentHandler,
  listAppointments: listAppointmentsHandler,
  getCustomerAppointments,
  getActiveAppointment,
  updateAppointmentStatus: updateAppointmentStatusHandler,
  lookupAppointment: lookupAppointmentHandler
};
