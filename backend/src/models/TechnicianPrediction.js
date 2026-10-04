const mongoose = require('mongoose');

const technicianPredictionSchema = new mongoose.Schema(
    {
        technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
        technicianName: { type: String, required: true },
        experienceYears: { type: Number, required: true },
        jobCount: { type: Number, required: true },
        workSuccessRate: { type: Number, required: true },
        customerSatisfaction: { type: String, required: true },
        speedRank: { type: String, required: true },
        overallScore: { type: Number, required: true },
        recommendation: { type: String, required: true },
        promotionStatus: { type: String, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model('TechnicianPrediction', technicianPredictionSchema);
