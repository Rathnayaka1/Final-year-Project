const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    partName: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
    },
    partNumber: {
      type: String,
      required: [true, 'Part number is required'],
      trim: true,
      unique: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    minQuantity: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [0, 'Minimum quantity cannot be negative'],
      default: 10,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Stock', stockSchema);
