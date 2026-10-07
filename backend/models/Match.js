const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    lostItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    foundItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    similarityDetails: {
      nameScore: { type: Number, default: 0 },
      descScore: { type: Number, default: 0 },
      catScore: { type: Number, default: 0 },
      locScore: { type: Number, default: 0 },
      dateScore: { type: Number, default: 0 },
      distanceKm: { type: Number, default: null },
      matchCategory: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    },
    status: {
      type: String,
      enum: ['suggested', 'verified', 'dismissed'],
      default: 'suggested',
    },
  },
  {
    timestamps: true,
  }
);

matchSchema.index({ lostItemId: 1, foundItemId: 1 }, { unique: true });
matchSchema.index({ score: -1 });

module.exports = mongoose.model('Match', matchSchema);
