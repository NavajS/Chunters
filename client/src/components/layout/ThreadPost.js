import React from 'react';
import './ThreadPost.css';

function ThreadPost({ post }) {
  const { avatarBg, avatarColor, initials, timeAgo, category, categoryColor, content, replies, likes } = post;

  return (
    <div className="post">
      <div className="post-header">
        <div
          className="post-avatar"
          style={{ background: avatarBg, color: avatarColor }}
        >
          {initials}
        </div>
        <div className="post-author">Anonymous Gator</div>
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
        <div className="post-action">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {replies} replies
        </div>
        <div className="post-action">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes}
        </div>
        <button className="post-report">Report</button>
      </div>
    </div>
  );
}

export default ThreadPost;