import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import PostComposer from '../components/layout/PostComposer';
import ThreadPost from '../components/layout/ThreadPost';
import './Threadspage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const categoryInfo = {
  wellness: { label: 'Wellness', color: '#f0a878', description: "Share what's on your mind — stay anonymous" },
  academics: { label: 'Academics', color: '#e8927a', description: 'Study tips, class help, and advice' },
  social: { label: 'Social', color: '#e07090', description: 'Connect with other Gators anonymously' },
  support: { label: 'Support', color: '#7088c8', description: 'A space to lean on others when you need it' },
  'safe-space': { label: 'Safe space', color: '#c8a060', description: 'Judgement-free zone for heavier topics' },
  general: { label: 'General', color: '#50a878', description: 'Anything else on your mind' },
};

const emptyCategoryCounts = {
  wellness: 0,
  academics: 0,
  social: 0,
  support: 0,
  'safe-space': 0,
  general: 0,
};

function formatTimeAgo(isoDate) {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'just now';

  const seconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getInitials(displayName) {
  if (!displayName) return 'AG';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return parts.map((w) => w[0].toUpperCase()).join('').slice(0, 2) || 'AG';
}

function mapThreadToPost(thread) {
  const categoryKey = categoryInfo[thread.category] ? thread.category : 'general';
  const info = categoryInfo[categoryKey];

  return {
    id: thread.id,
    displayName: thread.displayName || null,
    avatarBg: '#f5e6d0',
    avatarColor: '#b87530',
    initials: getInitials(thread.displayName),
    timeAgo: formatTimeAgo(thread.createdAt),
    category: info.label,
    categoryKey,
    categoryColor: info.color,
    content: thread.content,
    replies: thread.replyCount || 0,
    likes: thread.likeCount || 0,
    likedByMe: Boolean(thread.likedByMe),
  };
}

function ThreadsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('wellness');
  const [sortBy, setSortBy] = useState('newest');
  const [posts, setPosts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState(emptyCategoryCounts);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [openRepliesThreadId, setOpenRepliesThreadId] = useState(null);
  const [repliesByThread, setRepliesByThread] = useState({});
  const [loadingRepliesByThread, setLoadingRepliesByThread] = useState({});
  const [replyingByThread, setReplyingByThread] = useState({});

  const info = useMemo(() => categoryInfo[activeCategory], [activeCategory]);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const ensureSignedIn = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSubmitError('You need to sign in again to perform that action.');
      return null;
    }
    return token;
  }, []);

  const fetchCategoryCounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/threads/meta`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load category counts.');
      }

      setCategoryCounts({ ...emptyCategoryCounts, ...(data.categories || {}) });
    } catch (error) {
      console.error('Category count fetch failed:', error);
      setCategoryCounts(emptyCategoryCounts);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    try {
      const params = new URLSearchParams({ category: activeCategory, sort: sortBy });
      const response = await fetch(`${API_URL}/api/threads?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load threads.');
      }

      setPosts((data.threads || []).map(mapThreadToPost));
    } catch (error) {
      setFetchError(error.message || 'Unable to load threads.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, getAuthHeaders, sortBy]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  const handleNewPost = async (content) => {
    setSubmitError('');
    setStatusMessage('');

    const token = ensureSignedIn();
    if (!token) {
      throw new Error('Missing auth token');
    }

    setIsPosting(true);

    try {
      const response = await fetch(`${API_URL}/api/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, category: activeCategory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create thread.');
      }

      setPosts((prevPosts) => [mapThreadToPost(data.thread), ...prevPosts]);
      setCategoryCounts((prev) => ({
        ...prev,
        [activeCategory]: (prev[activeCategory] || 0) + 1,
      }));
      setStatusMessage('Thread posted.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to create thread.');
      throw error;
    } finally {
      setIsPosting(false);
    }
  };

  const loadReplies = async (threadId) => {
    setLoadingRepliesByThread((prev) => ({ ...prev, [threadId]: true }));
    setSubmitError('');

    try {
      const response = await fetch(`${API_URL}/api/threads/${threadId}/posts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load replies.');
      }

      setRepliesByThread((prev) => ({ ...prev, [threadId]: data.posts || [] }));
    } catch (error) {
      setSubmitError(error.message || 'Failed to load replies.');
    } finally {
      setLoadingRepliesByThread((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  const handleToggleReplies = async (threadId) => {
    if (openRepliesThreadId === threadId) {
      setOpenRepliesThreadId(null);
      return;
    }

    setOpenRepliesThreadId(threadId);

    if (!repliesByThread[threadId]) {
      await loadReplies(threadId);
    }
  };

  const handleReplySubmit = async (threadId, content) => {
    setSubmitError('');
    setStatusMessage('');

    const token = ensureSignedIn();
    if (!token) {
      throw new Error('Missing auth token');
    }

    setReplyingByThread((prev) => ({ ...prev, [threadId]: true }));

    try {
      const response = await fetch(`${API_URL}/api/threads/${threadId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reply.');
      }

      setRepliesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), data.post],
      }));

      setPosts((prev) => prev.map((post) => (
        post.id === threadId
          ? { ...post, replies: post.replies + 1 }
          : post
      )));

      setStatusMessage('Reply posted.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to create reply.');
      throw error;
    } finally {
      setReplyingByThread((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  const handleToggleLike = async (threadId) => {
    setSubmitError('');
    setStatusMessage('');

    const token = ensureSignedIn();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/threads/${threadId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update like.');
      }

      setPosts((prev) => prev.map((post) => (
        post.id === threadId
          ? { ...post, likes: data.likeCount, likedByMe: data.liked }
          : post
      )));
    } catch (error) {
      setSubmitError(error.message || 'Failed to update like.');
    }
  };

  const handleReport = async (threadId, reason) => {
    setSubmitError('');
    setStatusMessage('');

    const token = ensureSignedIn();
    if (!token) {
      throw new Error('Missing auth token');
    }

    const response = await fetch(`${API_URL}/api/threads/${threadId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Failed to submit report.');
      setSubmitError(error.message);
      throw error;
    }

    setStatusMessage(data.message || 'Report submitted.');
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('token');

    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (_error) {
      // best effort; always clear local token
    }

    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="threads-page">
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onNewThread={() => document.querySelector('.composer-input')?.focus()}
        categoryCounts={categoryCounts}
        onAccount={() => navigate('/account')}
        onLogout={handleLogout}
      />

      <main className="threads-main">
        <div className="threads-topbar">
          <div>
            <h1 className="threads-title">{info.label}</h1>
            <p className="threads-description">{info.description}</p>
          </div>
          <div className="threads-filters">
            <button
              className={`filter-btn ${sortBy === 'newest' ? 'active' : ''}`}
              onClick={() => setSortBy('newest')}
            >
              Newest
            </button>
            <button
              className={`filter-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              Popular
            </button>
          </div>
        </div>

        <div className="threads-content">
          <PostComposer onPost={handleNewPost} disabled={isPosting} />

          {submitError && <div className="threads-message error">{submitError}</div>}
          {statusMessage && <div className="threads-message success">{statusMessage}</div>}
          {fetchError && <div className="threads-message error">{fetchError}</div>}
          {!fetchError && loading && <div className="threads-message muted">Loading threads...</div>}
          {!fetchError && !loading && posts.length === 0 && (
            <div className="threads-message muted">No threads in this category yet.</div>
          )}

          {!loading && posts.map((post) => (
            <ThreadPost
              key={post.id}
              post={post}
              repliesOpen={openRepliesThreadId === post.id}
              replies={repliesByThread[post.id] || []}
              repliesLoading={Boolean(loadingRepliesByThread[post.id])}
              replying={Boolean(replyingByThread[post.id])}
              onToggleReplies={handleToggleReplies}
              onReply={handleReplySubmit}
              onToggleLike={handleToggleLike}
              onReport={handleReport}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default ThreadsPage;
