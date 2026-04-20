const pool = require('../config/db');

const REPORT_THRESHOLD = 5;
const STRIKE_THRESHOLD = 3;

async function strikeAndMaybeBan(client, authorId, strikeReason) {
  const actions = { strikeIssued: false, userBanned: false, strikeCount: 0 };

  // Issue a strike
  await client.query(
    `INSERT INTO strikes (user_id, issued_by, reason) VALUES ($1, $1, $2)`,
    [authorId, strikeReason]
  );

  await client.query(
    'UPDATE users SET strike_count = strike_count + 1, updated_at = NOW() WHERE id = $1',
    [authorId]
  );
  actions.strikeIssued = true;

  // Check updated strike count
  const userResult = await client.query(
    'SELECT strike_count, status FROM users WHERE id = $1',
    [authorId]
  );
  actions.strikeCount = userResult.rows[0].strike_count;

  // Auto-ban at threshold
  if (actions.strikeCount >= STRIKE_THRESHOLD && userResult.rows[0].status !== 'banned') {
    const existingBan = await client.query(
      'SELECT id FROM bans WHERE user_id = $1 AND is_active = true',
      [authorId]
    );

    if (existingBan.rows.length === 0) {
      await client.query(
        `INSERT INTO bans (user_id, issued_by, reason, is_permanent, is_active)
         VALUES ($1, $1, $2, true, true)`,
        [authorId, 'Auto-banned: received ' + STRIKE_THRESHOLD + ' strikes for reported content']
      );

      await client.query(
        `UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = $1`,
        [authorId]
      );
      actions.userBanned = true;
    }
  }

  return actions;
}

async function checkThreadReportThreshold(threadId) {
  const client = await pool.connect();
  const result = { threadRemoved: false, strikeIssued: false, userBanned: false, reportCount: 0, strikeCount: 0 };

  try {
    await client.query('BEGIN');

    const countResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS report_count FROM reports WHERE reported_thread_id = $1',
      [threadId]
    );
    result.reportCount = countResult.rows[0].report_count;

    if (result.reportCount < REPORT_THRESHOLD) {
      await client.query('COMMIT');
      return result;
    }

    const threadResult = await client.query(
      'SELECT id, user_id, is_deleted FROM threads WHERE id = $1',
      [threadId]
    );

    if (threadResult.rows.length === 0 || threadResult.rows[0].is_deleted) {
      await client.query('COMMIT');
      return result;
    }

    const thread = threadResult.rows[0];

    // Remove the thread
    await client.query(
      'UPDATE threads SET is_deleted = true, updated_at = NOW() WHERE id = $1',
      [threadId]
    );
    result.threadRemoved = true;

    // Resolve all pending reports
    await client.query(
      `UPDATE reports SET status = 'resolved', reviewed_at = NOW()
       WHERE reported_thread_id = $1 AND status IN ('pending', 'reviewing')`,
      [threadId]
    );

    const strikeResult = await strikeAndMaybeBan(
      client,
      thread.user_id,
      'Auto-strike: thread removed after receiving ' + REPORT_THRESHOLD + ' reports'
    );
    Object.assign(result, strikeResult);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Thread auto-moderation error:', error);
    return result;
  } finally {
    client.release();
  }
}

async function checkPostReportThreshold(postId) {
  const client = await pool.connect();
  const result = { postRemoved: false, strikeIssued: false, userBanned: false, reportCount: 0, strikeCount: 0 };

  try {
    await client.query('BEGIN');

    const countResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS report_count FROM reports WHERE reported_post_id = $1',
      [postId]
    );
    result.reportCount = countResult.rows[0].report_count;

    if (result.reportCount < REPORT_THRESHOLD) {
      await client.query('COMMIT');
      return result;
    }

    const postResult = await client.query(
      'SELECT id, user_id, is_deleted FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0 || postResult.rows[0].is_deleted) {
      await client.query('COMMIT');
      return result;
    }

    const post = postResult.rows[0];

    // Remove the post
    await client.query(
      'UPDATE posts SET is_deleted = true, updated_at = NOW() WHERE id = $1',
      [postId]
    );
    result.postRemoved = true;

    // Resolve all pending reports
    await client.query(
      `UPDATE reports SET status = 'resolved', reviewed_at = NOW()
       WHERE reported_post_id = $1 AND status IN ('pending', 'reviewing')`,
      [postId]
    );

    // Strike and maybe ban
    const strikeResult = await strikeAndMaybeBan(
      client,
      post.user_id,
      'Auto-strike: post removed after receiving ' + REPORT_THRESHOLD + ' reports'
    );
    Object.assign(result, strikeResult);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Post auto-moderation error:', error);
    return result;
  } finally {
    client.release();
  }
}

async function isUserBanned(userId) {
  try {
    const result = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return false;
    return result.rows[0].status === 'banned';
  } catch (error) {
    console.error('Ban check error:', error);
    return false;
  }
}

/**
 * Get full moderation status for a user (for frontend display).
 */
async function getUserModerationStatus(userId) {
  try {
    const result = await pool.query(
      `SELECT u.status, u.strike_count, b.reason AS ban_reason, b.created_at AS banned_at
       FROM users u
       LEFT JOIN bans b ON b.user_id = u.id AND b.is_active = true
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { status: 'active', strikeCount: 0, isBanned: false, banReason: null };
    }

    const user = result.rows[0];
    return {
      status: user.status,
      strikeCount: user.strike_count,
      isBanned: user.status === 'banned',
      banReason: user.ban_reason || null,
      bannedAt: user.banned_at || null,
    };
  } catch (error) {
    console.error('Moderation status error:', error);
    return { status: 'active', strikeCount: 0, isBanned: false, banReason: null };
  }
}

module.exports = {
  checkThreadReportThreshold,
  checkPostReportThreshold,
  isUserBanned,
  getUserModerationStatus,
  REPORT_THRESHOLD,
  STRIKE_THRESHOLD,
};