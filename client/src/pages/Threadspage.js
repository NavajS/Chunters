import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import PostComposer from '../components/layout/PostComposer';
import ThreadPost from '../components/layout/ThreadPost';
import './Threadspage.css';

const categoryInfo = {
  wellness: { label: 'Wellness', color: '#f0a878', description: "Share what's on your mind — stay anonymous" },
  academics: { label: 'Academics', color: '#e8927a', description: 'Study tips, class help, and advice' },
  social: { label: 'Social', color: '#e07090', description: 'Connect with other Gators anonymously' },
  support: { label: 'Support', color: '#7088c8', description: 'A space to lean on others when you need it' },
  'safe-space': { label: 'Safe space', color: '#c8a060', description: 'Judgement-free zone for heavier topics' },
  general: { label: 'General', color: '#50a878', description: 'Anything else on your mind' },
};

// Sample posts — replace with fetched data from backend
const samplePosts = [
  {
    id: 1,
    avatarBg: '#f5e6d0',
    avatarColor: '#b87530',
    initials: 'AG',
    timeAgo: '2h ago',
    category: 'Wellness',
    categoryColor: '#f0a878',
    content: "Finals week is killing me. Anyone have tips for managing stress when you have 3 exams in the same week? I've been trying to meditate but my mind just races.",
    replies: 12,
    likes: 28,
  },
  {
    id: 2,
    avatarBg: '#d8dff8',
    avatarColor: '#5570b0',
    initials: 'AG',
    timeAgo: '5h ago',
    category: 'Wellness',
    categoryColor: '#f0a878',
    content: "Just wanted to share — if you're feeling overwhelmed, the counseling center at Peabody Hall is free for students. They really helped me last semester.",
    replies: 7,
    likes: 54,
  },
  {
    id: 3,
    avatarBg: '#f8d8e8',
    avatarColor: '#d05070',
    initials: 'AG',
    timeAgo: '1d ago',
    category: 'Wellness',
    categoryColor: '#f0a878',
    content: 'Does anyone actually sleep 8 hours during midterm szn? Asking for a friend (me).',
    replies: 23,
    likes: 87,
  },
];

function ThreadsPage() {
  const [activeCategory, setActiveCategory] = useState('wellness');
  const [sortBy, setSortBy] = useState('newest');
  const [posts, setPosts] = useState(samplePosts);

  const info = categoryInfo[activeCategory];

  const handleNewPost = (content) => {
    // TODO: POST to backend, then refresh feed
    const newPost = {
      id: Date.now(),
      avatarBg: '#d0f0e0',
      avatarColor: '#40906a',
      initials: 'AG',
      timeAgo: 'just now',
      category: info.label,
      categoryColor: info.color,
      content,
      replies: 0,
      likes: 0,
    };
    setPosts([newPost, ...posts]);
  };

  return (
    <div className="threads-page">
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onNewThread={() => console.log('New thread modal')}
      />

      <main className="threads-main">
        {/* Top bar */}
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

        {/* Content */}
        <div className="threads-content">
          <PostComposer onPost={handleNewPost} />

          {posts.map((post) => (
            <ThreadPost key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default ThreadsPage;