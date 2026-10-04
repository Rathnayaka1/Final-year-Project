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
    notes: { type: String, default: '' },
    // AI Prediction Data (Auto-updated from appointments)
    totalJobs: { type: Number, default: 0 },
    averageRating: { type: Number, default: 4.0 }, // Default to 4.0 if no ratings yet
    successRate: { type: Number, default: 100 } // Percentage 0-100
  },
  { timestamps: true }
);

module.exports = mongoose.model('Technician', technicianSchema);
