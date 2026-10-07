const Match = require('../models/Match');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const {
  calculateHaversineDistance,
  calculateJaccardSimilarity,
  calculateStringMatchScore,
} = require('../utils/distanceCalculator');

/**
 * Calculate match score between a lost item and a found item.
 */
function calculateItemMatchScore(lostItem, foundItem) {
  // 1. Title / Name Similarity (35%)
  const nameSim = calculateStringMatchScore(lostItem.title, foundItem.title);
  const nameScore = nameSim * 100;

  // 2. Description Similarity (25%)
  const descSim = calculateJaccardSimilarity(lostItem.description, foundItem.description);
  const descScore = descSim * 100;

  // 3. Category Match (15%)
  const catScore = lostItem.category === foundItem.category ? 100 : 0;

  // 4. Location Proximity (15%)
  let locScore = 0;
  let distanceKm = null;

  if (
    lostItem.coordinates &&
    lostItem.coordinates.latitude &&
    foundItem.coordinates &&
    foundItem.coordinates.latitude
  ) {
    distanceKm = calculateHaversineDistance(
      lostItem.coordinates.latitude,
      lostItem.coordinates.longitude,
      foundItem.coordinates.latitude,
      foundItem.coordinates.longitude
    );

    if (distanceKm !== null) {
      if (distanceKm <= 0.2) locScore = 100;
      else if (distanceKm <= 0.5) locScore = 85;
      else if (distanceKm <= 1.5) locScore = 65;
      else if (distanceKm <= 3.0) locScore = 40;
      else if (distanceKm <= 5.0) locScore = 20;
      else locScore = 0;
    }
  } else {
    // Fallback to text location similarity
    const locSim = calculateStringMatchScore(lostItem.location, foundItem.location);
    locScore = locSim * 100;
  }

  // 5. Date Proximity (10%)
  const d1 = new Date(lostItem.reportDate || lostItem.createdAt).getTime();
  const d2 = new Date(foundItem.reportDate || foundItem.createdAt).getTime();
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

  let dateScore = 0;
  if (diffDays <= 1) dateScore = 100;
  else if (diffDays <= 3) dateScore = 80;
  else if (diffDays <= 7) dateScore = 60;
  else if (diffDays <= 14) dateScore = 30;
  else if (diffDays <= 30) dateScore = 10;
  else dateScore = 0;

  // Weighted total score calculation
  const totalScore = Math.round(
    nameScore * 0.35 +
      descScore * 0.25 +
      catScore * 0.15 +
      locScore * 0.15 +
      dateScore * 0.10
  );

  let matchCategory = 'Low';
  if (totalScore >= 70) matchCategory = 'High';
  else if (totalScore >= 45) matchCategory = 'Medium';

  return {
    score: totalScore,
    similarityDetails: {
      nameScore: Math.round(nameScore),
      descScore: Math.round(descScore),
      catScore: Math.round(catScore),
      locScore: Math.round(locScore),
      dateScore: Math.round(dateScore),
      distanceKm,
      matchCategory,
    },
  };
}

/**
 * Run smart matching for a newly created or updated item.
 */
async function runSmartMatchingForItem(newItem) {
  try {
    const isLost = newItem.type === 'lost';
    const targetType = isLost ? 'found' : 'lost';

    // Find all active items of the opposite type
    const candidateItems = await Item.find({
      type: targetType,
      status: { $in: ['active', 'matched'] },
      _id: { $ne: newItem._id },
    });

    const newMatches = [];

    for (const candidate of candidateItems) {
      const lostItem = isLost ? newItem : candidate;
      const foundItem = isLost ? candidate : newItem;

      const { score, similarityDetails } = calculateItemMatchScore(lostItem, foundItem);

      // Only record matches with score >= 25%
      if (score >= 25) {
        const matchData = {
          lostItemId: lostItem._id,
          foundItemId: foundItem._id,
          score,
          similarityDetails,
        };

        // Upsert into Match collection
        const updatedMatch = await Match.findOneAndUpdate(
          { lostItemId: lostItem._id, foundItemId: foundItem._id },
          matchData,
          { upsert: true, new: true }
        );

        newMatches.push(updatedMatch);

        // Notify both owners if score is high or medium (>= 45)
        if (score >= 45) {
          // Notify lost item reporter
          await Notification.create({
            userId: lostItem.reportedBy,
            message: `Potential ${similarityDetails.matchCategory} match (${score}%) found for your lost "${lostItem.title}"!`,
            type: 'match',
            relatedItem: foundItem._id,
          });

          // Notify found item reporter
          await Notification.create({
            userId: foundItem.reportedBy,
            message: `Potential ${similarityDetails.matchCategory} match (${score}%) found for your found "${foundItem.title}"!`,
            type: 'match',
            relatedItem: lostItem._id,
          });

          // Update item status to 'matched' if currently 'active'
          if (lostItem.status === 'active') {
            await Item.findByIdAndUpdate(lostItem._id, { status: 'matched' });
          }
          if (foundItem.status === 'active') {
            await Item.findByIdAndUpdate(foundItem._id, { status: 'matched' });
          }
        }
      }
    }

    return newMatches;
  } catch (err) {
    console.error('Error executing smart matching algorithm:', err);
    return [];
  }
}

/**
 * Get matches for a specific item ID.
 */
async function getItemMatches(itemId) {
  const item = await Item.findById(itemId);
  if (!item) return [];

  const isLost = item.type === 'lost';
  const query = isLost ? { lostItemId: itemId } : { foundItemId: itemId };
  const populateField = isLost ? 'foundItemId' : 'lostItemId';

  const matches = await Match.find(query)
    .populate({
      path: populateField,
      select: 'title category location reportDate images status reportedBy description',
      populate: { path: 'reportedBy', select: 'name email department' },
    })
    .sort({ score: -1 });

  return matches;
}

module.exports = {
  calculateItemMatchScore,
  runSmartMatchingForItem,
  getItemMatches,
};
