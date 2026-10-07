const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an item title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a detailed description'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: [
        'Electronics',
        'Books & Stationery',
        'ID & Wallet',
        'Clothing & Accessories',
        'Keys',
        'Sports & Fitness',
        'Jewelry & Watches',
        'Bags & Backpacks',
        'Other',
      ],
      default: 'Other',
    },
    type: {
      type: String,
      required: [true, 'Specify report type'],
      enum: ['lost', 'found'],
    },
    images: [
      {
        type: String,
      },
    ],
    location: {
      type: String,
      required: [true, 'Please specify the approximate location'],
      trim: true,
    },
    coordinates: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    reportDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'matched', 'claimed', 'recovered', 'archived'],
      default: 'active',
    },
    distinctiveDetails: {
      type: String,
      trim: true,
      default: '',
    },
    contactMethod: {
      type: String,
      default: 'in_app',
    },
    safeContactPreference: {
      type: String,
      default: 'Campus Admin Verification',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for fast search queries
itemSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });
itemSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
