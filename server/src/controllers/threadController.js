const { checkPostReportThreshold, checkThreadReportThreshold } = require('../services/moderationService');
const pool = require('../config/db');

const CATEGORIES = [
  'wellness',
  'academics',
  'social',
  'support',
  'safe-space',
  'general',
];

const CATEGORY_SET = new Set(CATEGORIES);

let likeTableInitPromise = null;

// Validates whether a value is a UUID string.
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    (value || '').toString().trim(),
  );
}

// Ensures the thread-like table and indexes exist before like operations run.
async function ensureLikeTable() {
  if (!likeTableInitPromise) {
    likeTableInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS thread_likes (
          thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (thread_id, user_id)
        )
      `);

      await pool.query('CREATE INDEX IF NOT EXISTS idx_thread_likes_thread_id ON thread_likes(thread_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_thread_likes_user_id ON thread_likes(user_id)');
    })().catch((error) => {
      likeTableInitPromise = null;
      throw error;
    });
  }

  return likeTableInitPromise;
}

// Normalizes category input and ensures it matches an allowed category.
function normalizeCategory(input) {
  const category = (input || 'general').toString().trim().toLowerCase();
  return CATEGORY_SET.has(category) ? category : null;
}

// Builds a safe thread title from explicit title input or fallback content text.
function buildTitle(title, content) {
  const trimmedTitle = (title || '').toString().trim();
  if (trimmedTitle) return trimmedTitle.slice(0, 200);

  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  return normalizedContent.slice(0, 80) || 'Untitled thread';
}

// Parses an integer with a fallback value when parsing fails.
function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// Maps a DB thread row into the thread shape returned to the frontend.
function mapThreadRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name || null,
    title: row.title,
    content: row.body,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replyCount: Number(row.reply_count || 0),
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
  };
}

// Maps a DB post row into the post shape returned to the frontend.
function mapPostRow(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    displayName: row.display_name || null,
    content: row.body,
    parentPostId: row.parent_post_id || null,
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Retrieves a non-deleted thread or returns null if it does not exist.
async function getThreadOrNull(threadId) {
  const query = `
    SELECT id, user_id, is_locked
    FROM threads
    WHERE id = $1 AND is_deleted = FALSE
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [threadId]);
  return rows[0] || null;
}

const threadDetailQuery = `
  SELECT
    t.id,
    t.user_id,
    u.display_name,
    t.title,
    t.body,
    t.category,
    t.created_at,
    t.updated_at,
    COALESCE(reply_stats.reply_count, 0) AS reply_count,
    COALESCE(like_stats.like_count, 0) AS like_count,
    COALESCE(like_stats.liked_by_me, FALSE) AS liked_by_me
  FROM threads t
  LEFT JOIN users u ON u.id = t.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM posts p
    WHERE p.thread_id = t.id AND p.is_deleted = FALSE
  ) AS reply_stats ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::INTEGER AS like_count,
      COALESCE(BOOL_OR(tl.user_id = $2::UUID), FALSE) AS liked_by_me
    FROM thread_likes tl
    WHERE tl.thread_id = t.id
  ) AS like_stats ON TRUE
  WHERE t.id = $1 AND t.is_deleted = FALSE
`;

// Lists threads for the feed with pagination, category filtering, and sorting.
async function listThreads(req, res) {
  try {
    await ensureLikeTable();

    const categoryParam = req.query.category ? normalizeCategory(req.query.category) : null;
    if (req.query.category && !categoryParam) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const sort = (req.query.sort || 'newest').toString().toLowerCase();
    const limit = Math.min(Math.max(toInt(req.query.limit, 30), 1), 100);
    const offset = Math.max(toInt(req.query.offset, 0), 0);
    const requestingUserId = req.user?.userId || null;

    const orderBy = sort === 'popular'
      ? 'reply_stats.reply_count DESC, like_stats.like_count DESC, t.created_at DESC'
      : 't.created_at DESC';

    const query = `
      SELECT
        t.id,
        t.user_id,
        u.display_name,
        t.title,
        t.body,
        t.category,
        t.created_at,
        t.updated_at,
        COALESCE(reply_stats.reply_count, 0) AS reply_count,
        COALESCE(like_stats.like_count, 0) AS like_count,
        COALESCE(like_stats.liked_by_me, FALSE) AS liked_by_me
      FROM threads t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::INTEGER AS reply_count
        FROM posts p
        WHERE p.thread_id = t.id
          AND p.is_deleted = FALSE
      ) AS reply_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS like_count,
          COALESCE(BOOL_OR(tl.user_id = $4::UUID), FALSE) AS liked_by_me
        FROM thread_likes tl
        WHERE tl.thread_id = t.id
      ) AS like_stats ON TRUE
      WHERE t.is_deleted = FALSE
        AND ($1::TEXT IS NULL OR t.category = $1)
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await pool.query(query, [categoryParam, limit, offset, requestingUserId]);
    return res.json({ threads: rows.map(mapThreadRow), hasMore: rows.length === limit });
  } catch (error) {
    console.error('List threads error:', error);
    return res.status(500).json({ error: 'Failed to fetch threads.' });
  }
}

// Returns one thread with aggregated reply and like metadata.
async function getThread(req, res) {
  try {
    await ensureLikeTable();

    const { threadId } = req.params;
    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    const requestingUserId = req.user?.userId || null;
    const { rows } = await pool.query(threadDetailQuery, [threadId, requestingUserId]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    return res.json({ thread: mapThreadRow(rows[0]) });
  } catch (error) {
    console.error('Get thread error:', error);
    return res.status(500).json({ error: 'Failed to fetch thread.' });
  }
}

// Creates a new top-level thread authored by the authenticated user.
async function createThread(req, res) {
  try {
    const { title, content, category } = req.body;
    const normalizedContent = (content || '').toString().trim();

    if (!normalizedContent) {
      return res.status(400).json({ error: 'Thread content is required.' });
    }

    if (normalizedContent.length > 5000) {
      return res.status(400).json({ error: 'Thread content must be 5000 characters or less.' });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const safeTitle = buildTitle(title, normalizedContent);

    const insertQuery = `
      WITH inserted AS (
        INSERT INTO threads (user_id, title, body, category)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, title, body, category, created_at, updated_at
      )
      SELECT i.*, u.display_name
      FROM inserted i
      LEFT JOIN users u ON u.id = i.user_id
    `;

    const { rows } = await pool.query(insertQuery, [
      userId,
      safeTitle,
      normalizedContent,
      normalizedCategory,
    ]);

    return res.status(201).json({
      thread: {
        ...mapThreadRow(rows[0]),
        replyCount: 0,
        likeCount: 0,
        likedByMe: false,
      },
    });
  } catch (error) {
    console.error('Create thread error:', error);
    return res.status(500).json({ error: 'Failed to create thread.' });
  }
}

// Returns aggregate thread counts per category for sidebar stats.
async function listThreadMeta(_req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT category, COUNT(*)::INTEGER AS thread_count
      FROM threads
      WHERE is_deleted = FALSE
      GROUP BY category
    `);

    const categoryCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));

    for (const row of rows) {
      const category = normalizeCategory(row.category);
      if (category) {
        categoryCounts[category] = Number(row.thread_count || 0);
      }
    }

    const total = Object.values(categoryCounts).reduce((sum, value) => sum + value, 0);

    return res.json({ categories: categoryCounts, total });
  } catch (error) {
    console.error('List thread meta error:', error);
    return res.status(500).json({ error: 'Failed to fetch thread categories.' });
  }
}

// Lists non-deleted replies for a specific thread in chronological order.
async function listThreadPosts(req, res) {
  try {
    const { threadId } = req.params;
    const requestingUserId = req.user?.userId || null;

    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    const thread = await getThreadOrNull(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const { rows } = await pool.query(
      `
      SELECT
        p.id, p.thread_id, p.user_id, u.display_name, p.body,
        p.parent_post_id, p.created_at, p.updated_at,
        COALESCE(like_stats.like_count, 0) AS like_count,
        COALESCE(like_stats.liked_by_me, FALSE) AS liked_by_me
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS like_count,
          COALESCE(BOOL_OR(pl.user_id = $2::UUID), FALSE) AS liked_by_me
        FROM post_likes pl
        WHERE pl.post_id = p.id
      ) AS like_stats ON TRUE
      WHERE p.thread_id = $1
        AND p.is_deleted = FALSE
      ORDER BY p.created_at ASC
      `,
      [threadId, requestingUserId],
    );

    return res.json({ posts: rows.map(mapPostRow) });
  } catch (error) {
    console.error('List thread posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch replies.' });
  }
}

// Creates a new reply inside a thread, optionally as a nested reply.
async function createThreadPost(req, res) {
  try {
    const { threadId } = req.params;
    const { content, parentPostId } = req.body;
    const userId = req.user?.userId;

    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const normalizedContent = (content || '').toString().trim();
    if (!normalizedContent) {
      return res.status(400).json({ error: 'Reply content is required.' });
    }

    if (normalizedContent.length > 2000) {
      return res.status(400).json({ error: 'Reply content must be 2000 characters or less.' });
    }

    const thread = await getThreadOrNull(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    if (thread.is_locked) {
      return res.status(423).json({ error: 'This thread is locked.' });
    }

    let resolvedParentPostId = null;
    if (parentPostId) {
      if (!isUuid(parentPostId)) {
        return res.status(400).json({ error: 'Invalid parent post ID.' });
      }
      const parentResult = await pool.query(
        'SELECT id FROM posts WHERE id = $1 AND thread_id = $2 AND is_deleted = FALSE LIMIT 1',
        [parentPostId, threadId],
      );
      if (!parentResult.rows.length) {
        return res.status(404).json({ error: 'Parent post not found.' });
      }
      resolvedParentPostId = parentPostId;
    }

    const { rows } = await pool.query(
      `
      WITH inserted AS (
        INSERT INTO posts (thread_id, user_id, body, parent_post_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, thread_id, user_id, body, parent_post_id, created_at, updated_at
      )
      SELECT i.*, u.display_name
      FROM inserted i
      LEFT JOIN users u ON u.id = i.user_id
      `,
      [threadId, userId, normalizedContent, resolvedParentPostId],
    );

    return res.status(201).json({
      post: {
        ...mapPostRow(rows[0]),
        likeCount: 0,
        likedByMe: false,
      },
    });
  } catch (error) {
    console.error('Create thread post error:', error);
    return res.status(500).json({ error: 'Failed to create reply.' });
  }
}

// Toggles the authenticated user's like on a thread and returns updated count.
async function toggleThreadLike(req, res) {
  try {
    await ensureLikeTable();

    const { threadId } = req.params;
    const userId = req.user?.userId;

    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const thread = await getThreadOrNull(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const { rows: deletedRows } = await pool.query(
      'DELETE FROM thread_likes WHERE thread_id = $1 AND user_id = $2 RETURNING thread_id',
      [threadId, userId],
    );

    let liked = false;

    if (deletedRows.length === 0) {
      await pool.query(
        'INSERT INTO thread_likes (thread_id, user_id) VALUES ($1, $2)',
        [threadId, userId],
      );
      liked = true;
    }

    const { rows } = await pool.query(
      'SELECT COUNT(*)::INTEGER AS like_count FROM thread_likes WHERE thread_id = $1',
      [threadId],
    );

    return res.json({
      threadId,
      liked,
      likeCount: Number(rows[0]?.like_count || 0),
    });
  } catch (error) {
    console.error('Toggle thread like error:', error);
    return res.status(500).json({ error: 'Failed to update like.' });
  }
}

// Toggles the authenticated user's like on a reply and returns updated count.
async function togglePostLike(req, res) {
  try {
    const { threadId, postId } = req.params;
    const userId = req.user?.userId;

    if (!isUuid(threadId) || !isUuid(postId)) {
      return res.status(400).json({ error: 'Invalid thread or post ID.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const postResult = await pool.query(
      'SELECT id FROM posts WHERE id = $1 AND thread_id = $2 AND is_deleted = FALSE LIMIT 1',
      [postId, threadId],
    );
    if (!postResult.rows.length) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const { rows: deletedRows } = await pool.query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING post_id',
      [postId, userId],
    );

    let liked = false;
    if (deletedRows.length === 0) {
      await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId],
      );
      liked = true;
    }

    const { rows } = await pool.query(
      'SELECT COUNT(*)::INTEGER AS like_count FROM post_likes WHERE post_id = $1',
      [postId],
    );

    return res.json({
      postId,
      liked,
      likeCount: Number(rows[0]?.like_count || 0),
    });
  } catch (error) {
    console.error('Toggle post like error:', error);
    return res.status(500).json({ error: 'Failed to update like.' });
  }
}

// Submits a report for a thread and triggers auto-moderation checks.
async function reportThread(req, res) {
  try {
    const { threadId } = req.params;
    const userId = req.user?.userId;
    const reason = (req.body.reason || '').toString().trim();

    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (reason.length < 5) {
      return res.status(400).json({ error: 'Report reason must be at least 5 characters.' });
    }

    if (reason.length > 1000) {
      return res.status(400).json({ error: 'Report reason must be 1000 characters or less.' });
    }

    const thread = await getThreadOrNull(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found.' });
    }

    const existingReport = await pool.query(
      `
      SELECT id
      FROM reports
      WHERE reporter_id = $1
        AND reported_thread_id = $2
        AND status IN ('pending', 'reviewing')
      LIMIT 1
      `,
      [userId, threadId],
    );

    if (existingReport.rows.length > 0) {
      return res.status(200).json({ message: 'You already have an active report for this thread.' });
    }

    await pool.query(
      `
      INSERT INTO reports (reporter_id, reported_thread_id, reason)
      VALUES ($1, $2, $3)
      `,
      [userId, threadId, reason],
    );
    const moderationResult = await checkThreadReportThreshold(threadId);

    return res.status(201).json({
      message: 'Report submitted. Thank you for helping keep Chunters safe.',
      ...moderationResult,
    });
  } catch (error) {
    console.error('Report thread error:', error);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
}

// Submits a report for a reply and triggers auto-moderation checks.
async function reportPost(req, res) {
  try {
    const { threadId, postId } = req.params;
    const userId = req.user?.userId;
    const reason = (req.body.reason || '').toString().trim();

    if (!isUuid(threadId)) {
      return res.status(400).json({ error: 'Invalid thread ID.' });
    }

    if (!isUuid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (reason.length < 5) {
      return res.status(400).json({ error: 'Report reason must be at least 5 characters.' });
    }

    if (reason.length > 1000) {
      return res.status(400).json({ error: 'Report reason must be 1000 characters or less.' });
    }

    const postResult = await pool.query(
      `SELECT id, user_id, is_deleted
       FROM posts
       WHERE id = $1 AND thread_id = $2 AND is_deleted = FALSE
       LIMIT 1`,
      [postId, threadId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const post = postResult.rows[0];

    if (post.user_id === userId) {
      return res.status(400).json({ error: 'You cannot report your own post.' });
    }

    const existingReport = await pool.query(
      `SELECT id FROM reports
       WHERE reporter_id = $1 AND reported_post_id = $2
         AND status IN ('pending', 'reviewing')
       LIMIT 1`,
      [userId, postId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(200).json({ message: 'You already have an active report for this post.' });
    }

    await pool.query(
      `INSERT INTO reports (reporter_id, reported_post_id, reason)
       VALUES ($1, $2, $3)`,
      [userId, postId, reason]
    );

    const moderationResult = await checkPostReportThreshold(postId);

    return res.status(201).json({
      message: 'Report submitted. Thank you for helping keep Chunters safe.',
      ...moderationResult,
    });

  } catch (error) {
    console.error('Report post error:', error);
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  listThreadMeta,
  listThreadPosts,
  createThreadPost,
  toggleThreadLike,
  togglePostLike,
  reportThread,
  reportPost,
};
