const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  updateCredentials,
  verifyEmail,
} = require('../controllers/authController');
const authenticate = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.put('/update', authenticate, updateCredentials);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;