const Item = require('../models/Item');
const ActivityLog = require('../models/ActivityLog');
const { runSmartMatchingForItem, getItemMatches } = require('../services/matchingService');

// @desc    Create a new lost or found item report
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      location,
      latitude,
      longitude,
      reportDate,
      distinctiveDetails,
      contactMethod,
      safeContactPreference,
    } = req.body;

    if (!title || !description || !category || !type || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (title, description, category, type, location)',
      });
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (req.body.imageUrls) {
      // JSON format image URLs array
      images = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
    }

    const itemData = {
      title: title.trim(),
      description: description.trim(),
      category,
      type,
      location: location.trim(),
      coordinates: {
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
      reportDate: reportDate ? new Date(reportDate) : new Date(),
      images,
      distinctiveDetails: distinctiveDetails ? distinctiveDetails.trim() : '',
      contactMethod: contactMethod || 'in_app',
      safeContactPreference: safeContactPreference || 'Campus Admin Verification',
      reportedBy: req.user.id,
    };

    const item = await Item.create(itemData);

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: type === 'lost' ? 'REPORT_LOST_ITEM' : 'REPORT_FOUND_ITEM',
      targetType: 'item',
      targetId: item._id.toString(),
      metadata: { title: item.title, category: item.category },
    });

    // Run Smart Matching Algorithm asynchronously
    runSmartMatchingForItem(item).catch((err) =>
      console.error('Smart matching background error:', err)
    );

    res.status(201).json({
      success: true,
      message: `Your ${type} item report has been published successfully!`,
      item,
    });
  } catch (err) {
    console.error('Create Item Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error creating item report' });
  }
};

// @desc    Get all items with search, filters, sorting & pagination
// @route   GET /api/items
// @access  Public
exports.getItems = async (req, res) => {
  try {
    const { search, category, type, status, location, sortBy, page = 1, limit = 12 } = req.query;

    const query = {};

    // Filter by type (lost / found)
    if (type) {
      query.type = type;
    }

    // Filter by status (default active and matched)
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['active', 'matched', 'claimed'] };
    }

    // Filter by Category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Location search
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Text search (search in title, description, location)
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Sort order
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'title') {
      sortOptions = { title: 1 };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('reportedBy', 'name studentId department')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      items,
    });
  } catch (err) {
    console.error('Get Items Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving items' });
  }
};

// @desc    Get single item details
// @route   GET /api/items/:id
// @access  Public (with optional user context)
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'reportedBy',
      'name email studentId department profileImage'
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.status(200).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error retrieving item details' });
  }
};

// @desc    Update an item report
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Check ownership or admin role
    if (item.reportedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this item' });
    }

    const updates = { ...req.body };

    // Process updated files if any
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map((file) => `/uploads/${file.filename}`);
    }

    item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    // Re-trigger smart matching
    runSmartMatchingForItem(item).catch(() => {});

    res.status(200).json({ success: true, message: 'Item updated successfully', item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error updating item' });
  }
};

// @desc    Delete an item report
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.reportedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this report' });
    }

    await item.deleteOne();

    await ActivityLog.create({
      userId: req.user.id,
      action: 'DELETE_ITEM',
      targetType: 'item',
      targetId: req.params.id,
    });

    res.status(200).json({ success: true, message: 'Item report deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error deleting item' });
  }
};

// @desc    Get matches for a given item
// @route   GET /api/items/:id/matches
// @access  Private
exports.getItemMatchesController = async (req, res) => {
  try {
    const matches = await getItemMatches(req.params.id);
    res.status(200).json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error calculating item matches' });
  }
};
