import React, { useState } from 'react';
import './PostComposer.css';

function PostComposer({ onPost }) {
  const [content, setContent] = useState('');

  const handlePost = () => {
    if (!content.trim()) return;
    if (onPost) onPost(content);
    console.log('New post:', content);
    setContent('');
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
          onChange={(e) => setContent(e.target.value)}
          rows={2}
        />
        <div className="composer-footer">
          <span className="composer-hint">Posting as Anonymous Gator</span>
          <button className="composer-btn" onClick={handlePost} disabled={!content.trim()}>
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

export default PostComposer;