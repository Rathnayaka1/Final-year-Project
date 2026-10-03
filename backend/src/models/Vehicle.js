const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    licensePlate: { type: String, required: true, trim: true, uppercase: true },
    vin: { type: String, trim: true },
    color: { type: String },
    mileage: { type: Number },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

vehicleSchema.index({ customer: 1, licensePlate: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
