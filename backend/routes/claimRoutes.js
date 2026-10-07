const express = require('express');
const router = express.Router();
const {
  createClaim,
  getMyClaims,
} = require('../controllers/claimController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', protect, upload.array('evidence', 3), createClaim);
router.get('/my', protect, getMyClaims);

module.exports = router;
