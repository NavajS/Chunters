const pool = require('../config/db');

/**
 * UNBAN A USER
 */
async function unbanUser(req, res) {
  const client = await pool.connect();

  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, status, strike_count FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.status !== 'banned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This user is not currently banned.' });
    }

    await client.query(
      'UPDATE bans SET is_active = false WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    await client.query(
      `UPDATE users SET status = 'active', strike_count = 0, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
       VALUES ($1, 'unban_user', 'user', $2, $3)`,
      [adminId, userId, JSON.stringify({ email: user.email, previous_strikes: user.strike_count })]
    );

    await client.query('COMMIT');

    return res.json({
      message: `User ${user.email} has been unbanned and strikes reset.`,
      user: { id: user.id, email: user.email, status: 'active', strikeCount: 0 },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Unban error:', error);
    return res.status(500).json({ error: 'Server error while unbanning user.' });
  } finally {
    client.release();
  }
}

/**
 * ADMIN DELETE THREAD
 */
async function adminDeleteThread(req, res) {
  try {
    const { threadId } = req.params;
    const adminId = req.user.userId;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required.' });
    }

    const threadResult = await pool.query(
      'SELECT id, user_id, title, is_deleted FROM threads WHERE id = $1',
      [threadId]
    );

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const thread = threadResult.rows[0];

    if (thread.is_deleted) {
      return res.status(400).json({ error: 'This thread is already deleted.' });
    }

    await pool.query(
      'UPDATE threads SET is_deleted = true, updated_at = NOW() WHERE id = $1',
      [threadId]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
       VALUES ($1, 'admin_delete_thread', 'thread', $2, $3)`,
      [adminId, threadId, JSON.stringify({ title: thread.title })]
    );

    return res.json({ message: 'Thread deleted by admin.', threadId });

  } catch (error) {
    console.error('Admin delete thread error:', error);
    return res.status(500).json({ error: 'Server error while deleting thread.' });
  }
}

/**
 * ADMIN DELETE POST
 */
async function adminDeletePost(req, res) {
  try {
    const { postId } = req.params;
    const adminId = req.user.userId;

    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required.' });
    }

    const postResult = await pool.query(
      'SELECT id, user_id, thread_id, body, is_deleted FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const post = postResult.rows[0];

    if (post.is_deleted) {
      return res.status(400).json({ error: 'This post is already deleted.' });
    }

    await pool.query(
      'UPDATE posts SET is_deleted = true, updated_at = NOW() WHERE id = $1',
      [postId]
    );

    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
       VALUES ($1, 'admin_delete_post', 'post', $2, $3)`,
      [adminId, postId, JSON.stringify({ thread_id: post.thread_id })]
    );

    return res.json({ message: 'Post deleted by admin.', postId });

  } catch (error) {
    console.error('Admin delete post error:', error);
    return res.status(500).json({ error: 'Server error while deleting post.' });
  }
}

/**
 * LIST BANNED USERS
 */
async function listBannedUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.strike_count, u.status, b.reason AS ban_reason, b.created_at AS banned_at
       FROM users u
       INNER JOIN bans b ON b.user_id = u.id AND b.is_active = true
       WHERE u.status = 'banned'
       ORDER BY b.created_at DESC`
    );

    return res.json({ bannedUsers: result.rows });

  } catch (error) {
    console.error('List banned users error:', error);
    return res.status(500).json({ error: 'Server error while fetching banned users.' });
  }
}

/**
 * BAN A USER
 */
async function banUser(req, res) {
  const client = await pool.connect();

  try {
    const { userId } = req.params;
    const adminId = req.user.userId;
    const reason = (req.body.reason || '').toString().trim();

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: 'Ban reason is required (at least 5 characters).' });
    }

    // Can't ban yourself
    if (userId === adminId) {
      return res.status(400).json({ error: 'You cannot ban yourself.' });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email, status, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.role === 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot ban another admin.' });
    }

    if (user.status === 'banned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This user is already banned.' });
    }

    await client.query(
      `INSERT INTO bans (user_id, issued_by, reason, is_permanent, is_active)
       VALUES ($1, $2, $3, true, true)`,
      [userId, adminId, reason]
    );

    await client.query(
      `UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, details)
       VALUES ($1, 'admin_ban_user', 'user', $2, $3)`,
      [adminId, userId, JSON.stringify({ email: user.email, reason })]
    );

    await client.query('COMMIT');

    return res.json({
      message: `User ${user.email} has been banned.`,
      user: { id: user.id, email: user.email, status: 'banned' },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ban user error:', error);
    return res.status(500).json({ error: 'Server error while banning user.' });
  } finally {
    client.release();
  }
}

/**
 * LIST ALL USERS
 */
async function listAllUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, role, status, strike_count, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json({ users: result.rows });

  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Server error while fetching users.' });
  }
}

module.exports = { unbanUser, banUser, adminDeleteThread, adminDeletePost, listBannedUsers, listAllUsers };