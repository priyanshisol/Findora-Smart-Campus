const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAnalyticsData,
  getAllUsersAdmin,
  updateItemStatusAdmin,
  deleteItemAdmin,
  getActivityLogs,
} = require('../controllers/adminController');
const {
  getAllClaimsAdmin,
  updateClaimStatusAdmin,
} = require('../controllers/claimController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes are protected and restricted to admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalyticsData);
router.get('/users', getAllUsersAdmin);
router.get('/claims', getAllClaimsAdmin);
router.put('/claims/:id', updateClaimStatusAdmin);
router.patch('/items/:id/status', updateItemStatusAdmin);
router.delete('/items/:id', deleteItemAdmin);
router.get('/activity-logs', getActivityLogs);

module.exports = router;
