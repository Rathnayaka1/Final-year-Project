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
      enum: ['All', 'Car', 'Van', 'Cab'] 
    },
    serviceType: {
      type: String,
      enum: ['Body Wash', 'Full Body', 'Interior'],
      default: 'Body Wash'
    },
    category: {
      type: String,
      default: 'Detailing & Wash',
      enum: ['Maintenance', 'Mechanical', 'Detailing & Wash', 'Electrical & AC', 'General']
    },
    serviceCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCenter',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);

