const mongoose = require('mongoose');
const { STATUS, QUEUE_STATUS } = require('../utils/constants');

const appointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    serviceCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCenter', index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    preferredDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    vehicleLocation: {
      label: { type: String },
      latitude: { type: Number },
      longitude: { type: Number }
    },
    notes: { type: String },
    queueNumber: { type: Number, required: true, index: true },
    confirmationCode: { type: String, required: true, unique: true },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.BOOKED },
    queueStatus: { type: String, enum: Object.values(QUEUE_STATUS), default: QUEUE_STATUS.WAITING },
    estimatedCost: { type: Number },
    estimatedDuration: { type: Number },
    actualCost: { type: Number },
    actualDuration: { type: Number },
    loyaltyPointsAwarded: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    partsReplaced: [{ name: String, cost: Number, quantity: Number }],
    invoiceUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
