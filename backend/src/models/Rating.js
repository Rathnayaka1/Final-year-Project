const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    serviceCenter: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCenter', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    response: { type: String, trim: true }
  },
  { timestamps: true }
);

ratingSchema.index({ appointment: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
