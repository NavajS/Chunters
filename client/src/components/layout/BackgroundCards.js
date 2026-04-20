import React from 'react';
import './BackgroundCards.css';

const icons = {
  social: (color) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  support: (color) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    </svg>
  ),
  shield: (color) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  heart: (color) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  chat: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

const cards = [
  // Wellness
  {
    label: 'Wellness',
    bg: '#f5e6d0',
    accent: '#d4944a',
    labelColor: '#b87530',
    lines: true,
    style: { top: '14%', left: '16%', width: 160, height: 110 },
    delay: 0.2,
    from: 'left',
  },
  // Academics
  {
    label: 'Academics',
    bg: '#f5ddd5',
    accent: '#d47a6a',
    labelColor: '#c0604a',
    lines: true,
    style: { top: '2%', right: '14%', width: 155, height: 100 },
    delay: 0.4,
    from: 'right',
  },
  // Social
  {
    iconKey: 'social',
    label: 'Social',
    bg: '#f8d8e8',
    accent: '#d05070',
    labelColor: '#d05070',
    style: { top: '18%', right: '12%', width: 140, height: 110 },
    delay: 0.6,
    from: 'right',
  },
  // Support
  {
    iconKey: 'support',
    label: 'Support',
    bg: '#d8dff8',
    accent: '#5570b0',
    labelColor: '#5570b0',
    style: { top: '38%', right: '10%', width: 140, height: 115 },
    delay: 0.8,
    from: 'right',
  },
  // Safe space
  {
    iconKey: 'shield',
    label: 'Safe space',
    bg: '#f5ead0',
    accent: '#a88040',
    labelColor: '#a88040',
    style: { bottom: '18%', right: '12%', width: 145, height: 115 },
    delay: 1.0,
    from: 'right',
  },
  // Heart
  {
    iconKey: 'heart',
    bg: '#f8d0e0',
    accent: '#d05070',
    iconOnly: true,
    style: { top: '38%', left: '18%', width: 80, height: 80 },
    delay: 0.5,
    from: 'left',
  },
  // 12 replies
  {
    iconKey: 'chat',
    label: '12 replies',
    bg: '#d5ddf0',
    accent: '#5070a8',
    labelColor: '#5070a8',
    isChat: true,
    style: { bottom: '20%', left: '14%', width: 160, height: 65 },
    delay: 0.7,
    from: 'left',
  },
  // General
  {
    label: 'General',
    bg: '#d0f0e0',
    accent: '#50a878',
    labelColor: '#40906a',
    lines: true,
    style: { bottom: '6%', left: '16%', width: 165, height: 100 },
    delay: 0.9,
    from: 'left',
  },
  // Deco top-left
  {
    bg: '#e0ddf0',
    accent: '#8080b8',
    lines: true,
    style: { top: '2%', left: '24%', width: 140, height: 60 },
    delay: 0.3,
    from: 'top',
  },
  // Deco top-center
  {
    bg: '#d0f0e8',
    style: { top: '1%', left: '38%', width: 110, height: 60 },
    delay: 0.25,
    from: 'top',
  },
  // Deco bottom-right
  {
    bg: '#c8f0e8',
    accent: '#50b8a0',
    lines: true,
    style: { bottom: '2%', right: '14%', width: 155, height: 90 },
    delay: 1.1,
    from: 'right',
  },
];

// Renders decorative category-themed cards used behind auth and account pages.
function BackgroundCards() {
  return (
    <div className="bg-cards">
      {cards.map((c, i) => (
        <div
          key={i}
          className={`bg-card bg-card--from-${c.from || 'left'}`}
          style={{
            ...c.style,
            background: c.bg,
            '--accent': c.accent || 'transparent',
            animationDelay: `${c.delay}s`,
          }}
        >
          {}
          {c.iconOnly && c.iconKey && (
            <div className="bg-card-icon-only">
              {icons[c.iconKey](c.accent)}
            </div>
          )}

          {}
          {c.iconKey && c.label && !c.iconOnly && !c.isChat && (
            <>
              <div className="bg-card-icon">{icons[c.iconKey](c.accent)}</div>
              <div className="bg-card-label" style={{ color: c.labelColor }}>{c.label}</div>
            </>
          )}

          {}
          {c.isChat && c.iconKey && (
            <div className="bg-card-chat">
              {icons[c.iconKey](c.accent)}
              <span style={{ color: c.labelColor }}>{c.label}</span>
            </div>
          )}

          {}
          {!c.iconKey && !c.iconOnly && c.label && (
            <div className="bg-card-label" style={{ color: c.labelColor }}>{c.label}</div>
          )}

          {c.lines && (
            <div className="bg-card-lines">
              <span style={{ background: c.accent }} />
              <span style={{ background: c.accent, opacity: 0.6 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default BackgroundCards;
