const express = require('express');
const {
  listThreads,
  createThread,
  listThreadMeta,
  listThreadPosts,
  createThreadPost,
  toggleThreadLike,
  reportThread,
} = require('../controllers/threadController');
const { requireAuth, maybeAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/meta', listThreadMeta);
router.get('/', maybeAuth, listThreads);
router.post('/', requireAuth, createThread);

router.get('/:threadId/posts', listThreadPosts);
router.post('/:threadId/posts', requireAuth, createThreadPost);
router.post('/:threadId/like', requireAuth, toggleThreadLike);
router.post('/:threadId/report', requireAuth, reportThread);

module.exports = router;
