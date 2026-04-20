import React, { useState } from 'react';
import './PostComposer.css';

// Renders the input card used to create a new top-level thread from the feed.
function PostComposer({ onPost, disabled = false }) {
  const [content, setContent] = useState('');

  // Submits a new thread draft and clears the composer when successful.
  const handlePost = async () => {
    if (!content.trim() || disabled) return;

    try {
      if (onPost) {
        await onPost(content);
      }
      setContent('');
    } catch (error) {
      console.error('Failed to publish thread:', error);
    }
  };

  return (
    <div className="composer">
      <div className="composer-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <line x1="22" y1="1" x2="2" y2="22" strokeWidth="2.8" />
        </svg>
      </div>
      <div className="composer-body">
        <textarea
          className="composer-input"
          placeholder="Share your thoughts anonymously..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={2}
          disabled={disabled}
        />
        <div className="composer-footer">
          <span className="composer-hint">Posting as Anonymous Gator</span>
          <button className="composer-btn" onClick={handlePost} disabled={!content.trim() || disabled}>
            {disabled ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostComposer;
