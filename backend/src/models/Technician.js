const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    specialization: { type: String, required: true, trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
    serviceCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCenter', default: null },
    skills: [{ type: String }],
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Technician', technicianSchema);
