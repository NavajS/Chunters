const express = require('express');
const {
  signup,
  login,
  logout,
  updateCredentials,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getAccount,
  updateDisplayName,
  deleteAccount,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.put('/update', requireAuth, updateCredentials);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/account', requireAuth, getAccount);
router.put('/account/display-name', requireAuth, updateDisplayName);
router.delete('/account', requireAuth, deleteAccount);

module.exports = router;