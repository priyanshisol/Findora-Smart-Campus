const Claim = require('../models/Claim');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc    Submit a claim for a found item
// @route   POST /api/claims
// @access  Private
exports.createClaim = async (req, res) => {
  try {
    const { itemId, explanation, privateDetails } = req.body;

    if (!itemId || !explanation || !privateDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required claim details (Item, Explanation, and Private Identifying Details)',
      });
    }

    // Verify item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Check if user is claiming their own reported item
    if (item.reportedBy.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit a claim for an item you reported yourself',
      });
    }

    // Check for existing claim by this user for this item
    const existingClaim = await Claim.findOne({ itemId, claimantId: req.user.id });
    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a claim for this item. Check your claims status in your dashboard.',
      });
    }

    // Evidence images
    let evidence = [];
    if (req.files && req.files.length > 0) {
      evidence = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (req.body.evidenceUrls) {
      evidence = Array.isArray(req.body.evidenceUrls) ? req.body.evidenceUrls : [req.body.evidenceUrls];
    }

    const claim = await Claim.create({
      itemId,
      claimantId: req.user.id,
      explanation: explanation.trim(),
      privateDetails: privateDetails.trim(),
      evidence,
      status: 'pending',
    });

    // Update item status to claimed
    item.status = 'claimed';
    await item.save();

    // Notify item finder/reporter that a claim was submitted
    await Notification.create({
      userId: item.reportedBy,
      message: `A new claim has been submitted for your found item: "${item.title}". Campus admins will review it soon.`,
      type: 'claim_new',
      relatedItem: item._id,
      relatedClaim: claim._id,
    });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'CLAIM_SUBMITTED',
      targetType: 'claim',
      targetId: claim._id.toString(),
      metadata: { itemTitle: item.title },
    });

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully! It is now under review by campus administrators.',
      claim,
    });
  } catch (err) {
    console.error('Create Claim Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error submitting claim' });
  }
};

// @desc    Get claims submitted by the logged-in student
// @route   GET /api/claims/my
// @access  Private
exports.getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user.id })
      .populate('itemId', 'title category type location images status reportDate')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: claims.length, claims });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error retrieving your claims' });
  }
};

// @desc    Get all claims (Administrator review queue)
// @route   GET /api/admin/claims
// @access  Private (Admin)
exports.getAllClaimsAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const claims = await Claim.find(query)
      .populate('itemId', 'title category type location images status reportedBy')
      .populate('claimantId', 'name email studentId department profileImage')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: claims.length, claims });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error retrieving claims for admin' });
  }
};

// @desc    Review & update claim status (Approve or Reject with Admin remarks)
// @route   PUT /api/admin/claims/:id
// @access  Private (Admin)
exports.updateClaimStatusAdmin = async (req, res) => {
  try {
    const { status, adminRemarks } = req.body;

    if (!['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid claim status' });
    }

    const claim = await Claim.findById(req.params.id)
      .populate('itemId')
      .populate('claimantId');

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim record not found' });
    }

    claim.status = status;
    claim.adminRemarks = adminRemarks ? adminRemarks.trim() : '';
    claim.reviewedBy = req.user.id;

    await claim.save();

    // If approved, update item status to 'recovered'
    if (status === 'approved' && claim.itemId) {
      await Item.findByIdAndUpdate(claim.itemId._id, { status: 'recovered' });
    } else if (status === 'rejected' && claim.itemId) {
      // Revert item status to active if all claims rejected
      const activeClaims = await Claim.countDocuments({
        itemId: claim.itemId._id,
        status: { $in: ['pending', 'under_review', 'approved'] },
        _id: { $ne: claim._id },
      });
      if (activeClaims === 0) {
        await Item.findByIdAndUpdate(claim.itemId._id, { status: 'active' });
      }
    }

    // Send Notification to Claimant
    let notifMessage = `Your claim for "${claim.itemId ? claim.itemId.title : 'Item'}" has been ${status.toUpperCase()}.`;
    if (adminRemarks) {
      notifMessage += ` Admin remarks: ${adminRemarks}`;
    }

    await Notification.create({
      userId: claim.claimantId._id,
      message: notifMessage,
      type: 'claim_update',
      relatedItem: claim.itemId ? claim.itemId._id : null,
      relatedClaim: claim._id,
    });

    // Log Activity
    await ActivityLog.create({
      userId: req.user.id,
      action: `CLAIM_${status.toUpperCase()}`,
      targetType: 'claim',
      targetId: claim._id.toString(),
      metadata: { claimantName: claim.claimantId.name, itemTitle: claim.itemId ? claim.itemId.title : '' },
    });

    res.status(200).json({
      success: true,
      message: `Claim successfully ${status}! Notification sent to student.`,
      claim,
    });
  } catch (err) {
    console.error('Update Claim Error:', err);
    res.status(500).json({ success: false, message: 'Server error updating claim status' });
  }
};
