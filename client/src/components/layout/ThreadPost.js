import React, { useState } from 'react';
import './ThreadPost.css';

function formatReplyTime(isoDate) {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'just now';

  const seconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ThreadPost({
  post,
  replies = [],
  repliesOpen = false,
  repliesLoading = false,
  replying = false,
  onToggleReplies,
  onReply,
  onToggleLike,
  onReport,
}) {
  const [replyDraft, setReplyDraft] = useState('');

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

  const submitReply = async () => {
    if (!replyDraft.trim() || !onReply) return;

    try {
      await onReply(id, replyDraft);
      setReplyDraft('');
    } catch (error) {
      console.error('Reply submit failed:', error);
    }
  };

  const handleReport = async () => {
    if (!onReport) return;

    const reason = window.prompt('Why are you reporting this thread?');
    if (!reason || !reason.trim()) return;

    try {
      await onReport(id, reason.trim());
    } catch (error) {
      console.error('Report failed:', error);
    }
  };

  return (
    <div className="post">
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

      <p className="post-content">{content}</p>

      <div className="post-actions">
        <button className="post-action" onClick={() => onToggleReplies && onToggleReplies(id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {replyCount} replies
        </button>
        <button className={`post-action ${likedByMe ? 'liked' : ''}`} onClick={() => onToggleLike && onToggleLike(id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes}
        </button>
        <button className="post-report" onClick={handleReport}>Report</button>
      </div>

      {repliesOpen && (
        <div className="post-replies">
          {repliesLoading && <div className="post-replies-message">Loading replies...</div>}
          {!repliesLoading && replies.length === 0 && (
            <div className="post-replies-message">No replies yet.</div>
          )}

          {!repliesLoading && replies.map((reply) => (
            <div key={reply.id} className="reply-item">
              <div className="reply-header">
                <span className="reply-author">{reply.displayName || 'Anonymous Gator'}</span>
                <span className="reply-time">{formatReplyTime(reply.createdAt)}</span>
              </div>
              <p className="reply-content">{reply.content}</p>
            </div>
          ))}

          <div className="reply-composer">
            <textarea
              className="reply-input"
              placeholder="Write a reply..."
              rows={2}
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              disabled={replying}
            />
            <button className="reply-btn" onClick={submitReply} disabled={!replyDraft.trim() || replying}>
              {replying ? 'Replying...' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThreadPost;
