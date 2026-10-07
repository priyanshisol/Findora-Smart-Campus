const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get admin dashboard overall stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'student' });
    const totalLost = await Item.countDocuments({ type: 'lost' });
    const totalFound = await Item.countDocuments({ type: 'found' });
    const pendingClaims = await Claim.countDocuments({ status: 'pending' });
    const approvedClaims = await Claim.countDocuments({ status: 'approved' });
    const recoveredItems = await Item.countDocuments({ status: 'recovered' });

    // Calculate recovery rate
    const totalItems = totalLost + totalFound;
    const recoveryRate = totalItems > 0 ? Math.round((recoveredItems / totalItems) * 100) : 0;

    const recentReports = await Item.find()
      .populate('reportedBy', 'name email studentId')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentClaims = await Claim.find()
      .populate('itemId', 'title type category')
      .populate('claimantId', 'name studentId department')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalLost,
        totalFound,
        pendingClaims,
        approvedClaims,
        recoveredItems,
        recoveryRate,
      },
      recentReports,
      recentClaims,
    });
  } catch (err) {
    console.error('Admin Dashboard Stats Error:', err);
    res.status(500).json({ success: false, message: 'Server error loading admin stats' });
  }
};

// @desc    Get detailed Chart.js analytics data
// @route   GET /api/admin/analytics
// @access  Private (Admin)
exports.getAnalyticsData = async (req, res) => {
  try {
    // 1. Reports by Category
    const categoryAgg = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 2. Lost vs Found Breakdown
    const lostVsFound = await Item.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // 3. Claim Status Distribution
    const claimStatusDist = await Claim.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // 4. Monthly Report Trends (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrendsAgg = await Item.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        categoryBreakdown: categoryAgg,
        lostVsFound,
        claimStatusDist,
        monthlyTrends: monthlyTrendsAgg,
      },
    });
  } catch (err) {
    console.error('Admin Analytics Error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching analytics data' });
  }
};

// @desc    Get all registered users (Admin user management)
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error retrieving users' });
  }
};

// @desc    Update item status (e.g. mark as recovered, active, archived)
// @route   PATCH /api/admin/items/:id/status
// @access  Private (Admin)
exports.updateItemStatusAdmin = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'matched', 'claimed', 'recovered', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid item status' });
    }

    const item = await Item.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `ADMIN_UPDATE_ITEM_STATUS_${status.toUpperCase()}`,
      targetType: 'item',
      targetId: item._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: `Item status updated to ${status}`,
      item,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error updating item status' });
  }
};

// @desc    Delete item by Admin
// @route   DELETE /api/admin/items/:id
// @access  Private (Admin)
exports.deleteItemAdmin = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'ADMIN_DELETE_ITEM',
      targetType: 'item',
      targetId: req.params.id,
    });

    res.status(200).json({ success: true, message: 'Item removed by administrator' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error removing item' });
  }
};

// @desc    Get activity logs
// @route   GET /api/admin/activity-logs
// @access  Private (Admin)
exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('userId', 'name role email')
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching activity logs' });
  }
};
