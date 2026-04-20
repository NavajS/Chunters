import React from 'react';
import './Sidebar.css';

const categories = [
  { key: 'wellness', label: 'Wellness', color: '#f0a878' },
  { key: 'academics', label: 'Academics', color: '#e8927a' },
  { key: 'social', label: 'Social', color: '#e07090' },
  { key: 'support', label: 'Support', color: '#7088c8' },
  { key: 'safe-space', label: 'Safe space', color: '#c8a060' },
  { key: 'general', label: 'General', color: '#50a878' },
];

function Sidebar({ activeCategory, onSelectCategory, onNewThread, categoryCounts = {}, onLogout, onAccount }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <line x1="22" y1="1" x2="2" y2="22" strokeWidth="2.8" />
          </svg>
        </div>
        <div>
          <div className="sidebar-title">Chunters</div>
          <div className="sidebar-subtitle">anonymous</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Threads</div>
        <div className="sidebar-list">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`sidebar-item ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.key)}
            >
              <span className="sidebar-dot" style={{ background: cat.color }} />
              <span className="sidebar-label">{cat.label}</span>
              <span className="sidebar-count">{categoryCounts[cat.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-new-btn" onClick={onNewThread}>
          + New thread
        </button>

        {onAccount && (
          <button className="sidebar-account-btn" onClick={onAccount}>
            Account settings
          </button>
        )}

        {onLogout && (
          <button className="sidebar-logout-btn" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;