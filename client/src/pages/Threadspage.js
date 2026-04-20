import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import PostComposer from '../components/layout/PostComposer';
import ThreadPost from '../components/layout/ThreadPost';
import './Threadspage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';
const PAGE_SIZE = 20;

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

// Formats an ISO timestamp into a short relative label for feed cards.
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

// Maps API thread records into the presentation model used by feed cards.
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

// Renders the main thread feed with category navigation and post creation.
function ThreadsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = searchParams.get('category');
    return categoryInfo[cat] ? cat : 'wellness';
  });
  const [sortBy, setSortBy] = useState('newest');
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState(emptyCategoryCounts);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const info = useMemo(() => categoryInfo[activeCategory], [activeCategory]);

  // Returns auth headers when a session token exists.
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Guards actions that require authentication and reports missing sessions.
  const ensureSignedIn = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSubmitError('You need to sign in again to perform that action.');
      return null;
    }
    return token;
  }, []);

  // Loads per-category thread totals shown in the sidebar.
  const fetchCategoryCounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/threads/meta`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load category counts.');
      setCategoryCounts({ ...emptyCategoryCounts, ...(data.categories || {}) });
    } catch (error) {
      console.error('Category count fetch failed:', error);
      setCategoryCounts(emptyCategoryCounts);
    }
  }, []);

  // Loads the first page of threads for the current category and sort mode.
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        sort: sortBy,
        limit: PAGE_SIZE,
        offset: 0,
      });
      const response = await fetch(`${API_URL}/api/threads?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load threads.');
      setPosts((data.threads || []).map(mapThreadToPost));
      setOffset(PAGE_SIZE);
      setHasMore(data.hasMore ?? (data.threads || []).length === PAGE_SIZE);
    } catch (error) {
      setFetchError(error.message || 'Unable to load threads.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, getAuthHeaders, sortBy]);

  // Loads the next page of threads for infinite-style feed pagination.
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        sort: sortBy,
        limit: PAGE_SIZE,
        offset,
      });
      const response = await fetch(`${API_URL}/api/threads?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load more threads.');
      const newPosts = (data.threads || []).map(mapThreadToPost);
      setPosts((prev) => [...prev, ...newPosts]);
      setOffset((prev) => prev + PAGE_SIZE);
      setHasMore(data.hasMore ?? newPosts.length === PAGE_SIZE);
    } catch (error) {
      setFetchError(error.message || 'Unable to load more threads.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  // Creates a new thread in the active category and prepends it to the feed.
  const handleNewPost = async (content) => {
    setSubmitError('');
    setStatusMessage('');

    const token = ensureSignedIn();
    if (!token) throw new Error('Missing auth token');

    setIsPosting(true);
    try {
      const response = await fetch(`${API_URL}/api/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, category: activeCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create thread.');
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

  // Toggles like state for a thread card in the feed.
  const handleToggleLike = async (threadId) => {
    setSubmitError('');
    const token = ensureSignedIn();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/threads/${threadId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update like.');
      setPosts((prev) => prev.map((post) => (
        post.id === threadId
          ? { ...post, likes: data.likeCount, likedByMe: data.liked }
          : post
      )));
    } catch (error) {
      setSubmitError(error.message || 'Failed to update like.');
    }
  };

  // Removes a thread card locally after moderation takedown.
  const handleThreadRemoved = (threadId) => {
    setPosts((prev) => prev.filter((t) => t.id !== threadId));
    setCategoryCounts((prev) => ({
      ...prev,
      [activeCategory]: Math.max((prev[activeCategory] || 0) - 1, 0),
    }));
  };

  // Navigates from feed cards to the full thread discussion view.
  const handleViewThread = (threadId) => {
    navigate(`/threads/${threadId}`);
  };

  // Calls logout endpoint, clears token, and redirects to sign-in.
  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (_) {}
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="threads-page">
      {/* Left rail for category navigation and account/session actions. */}
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onNewThread={() => document.querySelector('.composer-input')?.focus()}
        categoryCounts={categoryCounts}
        onAccount={() => navigate('/account')}
        onLogout={handleLogout}
      />

      {/* Main feed column for category context, composer, and thread list. */}
      <main className="threads-main">
        {/* Feed header mirrors the selected category and sort controls. */}
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

        {/* Feed content area containing composer, messages, and thread cards. */}
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
              onToggleLike={handleToggleLike}
              onThreadRemoved={handleThreadRemoved}
              onViewThread={handleViewThread}
            />
          ))}

          {hasMore && !loading && (
            <button
              className="load-more-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default ThreadsPage;
