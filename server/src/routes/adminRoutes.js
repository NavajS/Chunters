const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const { unbanUser, banUser, adminDeleteThread, adminDeletePost, listBannedUsers, listAllUsers } = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/users — list all users
router.get('/users', listAllUsers);

// GET /api/admin/banned-users — list all banned users
router.get('/banned-users', listBannedUsers);

// POST /api/admin/ban/:userId — ban a user
router.post('/ban/:userId', banUser);

// POST /api/admin/unban/:userId — unban a user
router.post('/unban/:userId', unbanUser);

// DELETE /api/admin/threads/:threadId — delete any thread
router.delete('/threads/:threadId', adminDeleteThread);

// DELETE /api/admin/posts/:postId — delete any post
router.delete('/posts/:postId', adminDeletePost);

module.exports = router;