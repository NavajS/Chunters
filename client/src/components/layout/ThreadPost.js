import React from 'react';
import './ThreadPost.css';
import ReportButton from './ReportButton';
import AdminDeleteButton from './AdminDeleteButton';

// Renders a thread preview card in the feed with reply, like, and report actions.
function ThreadPost({
  post,
  onToggleLike,
  onThreadRemoved,
  onViewThread,
}) {
  const {
    id,
    displayName,
    avatarBg,
    avatarColor,
    initials,
    timeAgo,
    category,
    categoryColor,
    content,
    replies: replyCount,
    likes,
    likedByMe,
  } = post;
   const getUserRole = () => {
    try {
     const token = localStorage.getItem('token');
     if (!token) return null;
     const payload = JSON.parse(atob(token.split('.')[1]));
     return payload.role;
   } catch { return null; }
  };

const userRole = getUserRole();

  return (
    <div className="post">
      {/* Card header for avatar, author identity, relative time, and category tag. */}
      <div className="post-header">
        <div className="post-avatar" style={{ background: avatarBg, color: avatarColor }}>
          {initials}
        </div>
        <div className="post-author">{displayName || 'Anonymous Gator'}</div>
        <div className="post-time">· {timeAgo}</div>
        {category && (
          <div
            className="post-tag"
            style={{
              background: `${categoryColor}26`,
              color: categoryColor,
            }}
          >
            {category}
          </div>
        )}
      </div>

      {/* Clickable thread preview that opens the full discussion page. */}
      <p
        className="post-content post-content--clickable"
        onClick={() => onViewThread && onViewThread(id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onViewThread && onViewThread(id); }}
      >
        {content}
      </p>

      {/* Inline actions for opening replies, toggling likes, and reporting content. */}
      <div className="post-actions">
        <button
          className="post-action"
          onClick={() => onViewThread && onViewThread(id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
        <button
          className={`post-action ${likedByMe ? 'liked' : ''}`}
          onClick={() => onToggleLike && onToggleLike(id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes}
        </button>
        <ReportButton threadId={id} onPostRemoved={() => onThreadRemoved && onThreadRemoved(id)} />
          {(userRole === 'admin' || userRole === 'moderator') && (
          <AdminDeleteButton threadId={id} onDeleted={onThreadRemoved} />
        )}
      </div>
    </div>
  );
}

export default ThreadPost;
