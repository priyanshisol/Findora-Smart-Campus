const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    claimantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    explanation: {
      type: String,
      required: [true, 'Please explain why this item belongs to you'],
      trim: true,
      maxlength: [1500, 'Explanation cannot exceed 1500 characters'],
    },
    privateDetails: {
      type: String,
      required: [true, 'Please provide private identifying details to confirm ownership'],
      trim: true,
      maxlength: [1000, 'Private details cannot exceed 1000 characters'],
    },
    evidence: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: 'pending',
    },
    adminRemarks: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

claimSchema.index({ itemId: 1, claimantId: 1 }, { unique: true });
claimSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
