const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getUserModerationStatus } = require('../services/moderationService');

router.get('/status', requireAuth, async (req, res) => {
  try {
    const status = await getUserModerationStatus(req.user.userId);
    return res.json(status);
  } catch (error) {
    console.error('Moderation status error:', error);
    return res.status(500).json({ error: 'Failed to fetch moderation status.' });
  }
});

module.exports = router;