const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    duration: { type: Number, default: 30 },
    basePrice: { type: Number, default: 0 },
    vehicleType: { 
      type: String, 
      default: 'All', 
      enum: ['All', 'Car', 'Van', 'Mini Bus', 'Cab'] 
    },
    category: {
      type: String,
      default: 'General',
      enum: ['Maintenance', 'Mechanical', 'Detailing & Wash', 'Electrical & AC', 'General']
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);

