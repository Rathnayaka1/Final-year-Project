const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['customer'], default: 'customer' },
    profileImage: { type: String },
    defaultVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTransactions: [
      {
        type: { type: String, enum: ['earn', 'redeem'], required: true },
        points: { type: Number, required: true, min: 1 },
        note: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
