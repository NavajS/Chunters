const express = require('express');
const {
  listThreads,
  createThread,
  listThreadMeta,
  listThreadPosts,
  createThreadPost,
  toggleThreadLike,
  reportThread,
  reportPost,
} = require('../controllers/threadController');
const { requireAuth, maybeAuth, requireNotBanned } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/meta', listThreadMeta);
router.get('/', maybeAuth, listThreads);
router.post('/', requireAuth, requireNotBanned, createThread);

router.get('/:threadId/posts', listThreadPosts);
router.post('/:threadId/posts', requireAuth, requireNotBanned, createThreadPost);
router.post('/:threadId/like', requireAuth, toggleThreadLike);
router.post('/:threadId/report', requireAuth, reportThread);
router.post('/:threadId/posts/:postId/report', requireAuth, reportPost);

module.exports = router;