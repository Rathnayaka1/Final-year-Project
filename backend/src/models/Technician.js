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
    // Performance stats (Updated dynamically from appointments & feedback)
    totalJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    averageRating: { type: Number, default: 4.0, min: 1, max: 5 },
    totalRatings: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 }, // Percentage (completed / total) * 100
    historicalSpeedRatio: { type: Number, default: 1.0 } // Running avg of (estimated / actual)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Technician', technicianSchema);
