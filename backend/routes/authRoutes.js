const express = require('express');
const router = express.Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Quick seed demo route for production deployment initial setup
router.all('/seed-demo', async (req, res) => {
  try {
    const { seedData } = require('../utils/seedData');
    await seedData(false);
    res.status(200).json({
      success: true,
      message: 'Findora demo data seeded successfully! You can now log in with admin@campus.edu / adminpassword123',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
