import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReportButton from '../components/layout/ReportButton';
import './ThreadDetailPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const categoryInfo = {
  wellness: { label: 'Wellness', color: '#f0a878' },
  academics: { label: 'Academics', color: '#e8927a' },
  social: { label: 'Social', color: '#e07090' },
  support: { label: 'Support', color: '#7088c8' },
  'safe-space': { label: 'Safe space', color: '#c8a060' },
  general: { label: 'General', color: '#50a878' },
};

// Formats an ISO timestamp into compact relative time for thread/reply metadata.
function formatTimeAgo(isoDate) {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'just now';
  const seconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Builds initials for avatar placeholders from a display name.
function getInitials(displayName) {
  if (!displayName) return 'AG';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return parts.map((w) => w[0].toUpperCase()).join('').slice(0, 2) || 'AG';
}

// Converts a flat reply list into a parent/child tree for nested rendering.
function buildPostTree(posts) {
  const byId = {};
  posts.forEach((p) => { byId[p.id] = { ...p, children: [] }; });
  const roots = [];
  posts.forEach((p) => {
    if (p.parentPostId && byId[p.parentPostId]) {
      byId[p.parentPostId].children.push(byId[p.id]);
    } else {
      roots.push(byId[p.id]);
    }
  });
  return roots;
}

// Renders a reusable heart icon for like actions.
function HeartIcon({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// Renders a reply input box used for top-level and nested replies.
function ReplyComposer({ onSubmit, submitting, placeholder = 'Write a reply...' }) {
  const [draft, setDraft] = useState('');

  // Submits the current reply draft if valid.
  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return;
    await onSubmit(draft.trim());
    setDraft('');
  };

  // Supports Cmd/Ctrl+Enter keyboard submission.
  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className="td-composer">
      <textarea
        className="td-composer-input"
        placeholder={placeholder}
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        disabled={submitting}
      />
      <button
        className="td-composer-btn"
        onClick={handleSubmit}
        disabled={!draft.trim() || submitting}
      >
        {submitting ? 'Posting...' : 'Reply'}
      </button>
    </div>
  );
}

// Renders one reply node and recursively renders any child replies.
function PostNode({ post, depth, threadId, authHeaders, onPostAdded, onPostRemoved }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe);

  const indentStyle = { paddingLeft: `${Math.min(depth, 4) * 20}px` };

  // Toggles like state for a single reply post.
  const handleLike = async () => {
    const headers = authHeaders();
    if (!headers.Authorization) return;
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}/posts/${post.id}/like`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likeCount);
        setLikedByMe(data.liked);
      }
    } catch (_) {}
  };

  // Creates a nested reply under the current post.
  const handleReply = async (content) => {
    const headers = authHeaders();
    if (!headers.Authorization) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentPostId: post.id }),
      });
      if (res.ok) {
        const data = await res.json();
        onPostAdded(data.post);
        setReplyOpen(false);
      }
    } catch (_) {} finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="td-post-node" style={indentStyle}>
      {depth > 0 && <div className="td-post-indent-line" />}
      <div className="td-post-item">
        <div className="td-post-item-header">
          <span className="td-post-item-author">{post.displayName || 'Anonymous Gator'}</span>
          <span className="td-post-item-time">{formatTimeAgo(post.createdAt)}</span>
        </div>
        <p className="td-post-item-content">{post.content}</p>
        <div className="td-post-item-actions">
          <button
            className={`td-post-item-action ${likedByMe ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <HeartIcon filled={likedByMe} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button
            className="td-post-item-action"
            onClick={() => setReplyOpen((o) => !o)}
          >
            Reply
          </button>
          <ReportButton
            threadId={threadId}
            postId={post.id}
            onPostRemoved={() => onPostRemoved(post.id)}
          />
        </div>
        {replyOpen && (
          <ReplyComposer
            onSubmit={handleReply}
            submitting={submitting}
            placeholder={`Replying to ${post.displayName || 'Anonymous Gator'}...`}
          />
        )}
      </div>
      {post.children.map((child) => (
        <PostNode
          key={child.id}
          post={child}
          depth={depth + 1}
          threadId={threadId}
          authHeaders={authHeaders}
          onPostAdded={onPostAdded}
          onPostRemoved={onPostRemoved}
        />
      ))}
    </div>
  );
}

// Renders a single thread view with full reply tree and actions.
function ThreadDetailPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();

  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [threadLikeCount, setThreadLikeCount] = useState(0);
  const [threadLikedByMe, setThreadLikedByMe] = useState(false);

  // Returns auth headers when a session token exists.
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [threadRes, postsRes] = await Promise.all([
          fetch(`${API_URL}/api/threads/${threadId}`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/threads/${threadId}/posts`, { headers: authHeaders() }),
        ]);

        if (threadRes.status === 401) { navigate('/'); return; }
        if (!threadRes.ok) { setError('Thread not found.'); setLoading(false); return; }

        const threadData = await threadRes.json();
        const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };

        setThread(threadData.thread);
        setThreadLikeCount(threadData.thread.likeCount);
        setThreadLikedByMe(threadData.thread.likedByMe);
        setPosts(postsData.posts || []);
      } catch (_) {
        setError('Failed to load discussion.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [threadId, navigate, authHeaders]);

  const postTree = useMemo(() => buildPostTree(posts), [posts]);

  // Toggles like state for the thread header card.
  const handleLikeThread = async () => {
    const headers = authHeaders();
    if (!headers.Authorization) return;
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}/like`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setThreadLikeCount(data.likeCount);
        setThreadLikedByMe(data.liked);
      }
    } catch (_) {}
  };

  // Creates a new top-level reply and updates local reply count.
  const handleTopLevelReply = async (content) => {
    const headers = authHeaders();
    if (!headers.Authorization) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}/posts`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) => [...prev, data.post]);
        setThread((t) => t ? { ...t, replyCount: t.replyCount + 1 } : t);
      }
    } catch (_) {} finally {
      setSubmitting(false);
    }
  };

  // Adds a newly created reply to local state.
  const handlePostAdded = useCallback((post) => {
    setPosts((prev) => [...prev, post]);
    setThread((t) => t ? { ...t, replyCount: t.replyCount + 1 } : t);
  }, []);

  // Removes a moderated/deleted reply from local state.
  const handlePostRemoved = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setThread((t) => t ? { ...t, replyCount: Math.max((t.replyCount || 1) - 1, 0) } : t);
  }, []);

  const categoryKey = thread?.category;
  const catInfo = categoryInfo[categoryKey] || categoryInfo.general;

  const backLabel = catInfo ? `← Back to ${catInfo.label}` : '← Back';

  // Navigates back to the feed, preserving the thread category when possible.
  const handleBack = () => {
    if (categoryKey) {
      navigate(`/threads?category=${categoryKey}`);
    } else {
      navigate('/threads');
    }
  };

  return (
    <div className="td-page">
      {/* Top navigation for returning to the feed and showing thread category. */}
      <div className="td-topbar">
        <button className="td-back-btn" onClick={handleBack}>{backLabel}</button>
        {thread && (
          <span
            className="td-category-tag"
            style={{ background: `${catInfo.color}26`, color: catInfo.color }}
          >
            {catInfo.label}
          </span>
        )}
      </div>

      {/* Main content area for loading states, thread card, composer, and replies. */}
      <div className="td-content">
        {loading && <div className="td-status muted">Loading discussion...</div>}
        {error && <div className="td-status error">{error}</div>}

        {!loading && thread && (
          <>
            {/* Primary thread card with author info, content, and thread actions. */}
            <div className="td-thread-card">
              <div className="td-thread-header">
                <div
                  className="td-thread-avatar"
                  style={{ background: '#f5e6d0', color: '#b87530' }}
                >
                  {getInitials(thread.displayName)}
                </div>
                <span className="td-thread-author">{thread.displayName || 'Anonymous Gator'}</span>
                <span className="td-thread-time">· {formatTimeAgo(thread.createdAt)}</span>
              </div>
              <p className="td-thread-body">{thread.content}</p>
              <div className="td-thread-actions">
                <button
                  className={`td-thread-action ${threadLikedByMe ? 'liked' : ''}`}
                  onClick={handleLikeThread}
                >
                  <HeartIcon filled={threadLikedByMe} />
                  {threadLikeCount > 0 ? threadLikeCount : ''} {threadLikedByMe ? 'Liked' : 'Like'}
                </button>
                <span className="td-thread-reply-count">
                  {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                <div className="td-thread-report">
                  <ReportButton
                    threadId={thread.id}
                    onPostRemoved={() => navigate('/threads')}
                  />
                </div>
              </div>
            </div>

            {/* Composer for new top-level replies in this discussion. */}
            <div className="td-reply-section">
              <h3 className="td-reply-heading">Join the discussion</h3>
              <ReplyComposer
                onSubmit={handleTopLevelReply}
                submitting={submitting}
                placeholder="Share your thoughts..."
              />
            </div>

            {/* Nested reply tree rendered from parent/child post relationships. */}
            {postTree.length > 0 && (
              <div className="td-posts">
                {postTree.map((post) => (
                  <PostNode
                    key={post.id}
                    post={post}
                    depth={0}
                    threadId={threadId}
                    authHeaders={authHeaders}
                    onPostAdded={handlePostAdded}
                    onPostRemoved={handlePostRemoved}
                  />
                ))}
              </div>
            )}

            {!loading && postTree.length === 0 && (
              <div className="td-status muted">No replies yet. Be the first to respond.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ThreadDetailPage;
