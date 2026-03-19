import React, { useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ─── Background Cards ─── */
const cards = [
  { label: 'Wellness', bg: '#3d3530', accent: '#f0a878', lines: true, style: { top: '16%', left: '6%', width: 130 }, delay: 0.1 },
  { label: 'Academics', bg: '#3a302e', accent: '#e8927a', lines: true, style: { top: '4%', right: '6%', width: 120 }, delay: 0.3 },
  { icon: '👥', label: 'Social', bg: '#3a2e34', accent: '#e07090', style: { top: '20%', right: '5%', width: 110 }, delay: 0.5 },
  { icon: '💬', label: 'Support', bg: '#302e3a', accent: '#8aa0d0', style: { top: '38%', right: '4%', width: 110 }, delay: 0.7 },
  { icon: '🛡', label: 'Safe space', bg: '#38342e', accent: '#d0b080', style: { bottom: '14%', right: '5%', width: 115 }, delay: 0.9 },
  { icon: '♡', bg: '#352e38', accent: '#e07090', style: { top: '36%', left: '7%', width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }, delay: 0.4 },
  { label: '💬 12 replies', bg: '#2e3038', accent: '#8090c0', style: { bottom: '18%', left: '5%', width: 140 }, delay: 0.6 },
  { label: 'General', bg: '#2e3832', accent: '#70c090', lines: true, style: { bottom: '6%', left: '10%', width: 130 }, delay: 0.8 },
  { bg: '#32323a', accent: '#6068a0', lines: true, style: { top: '3%', left: '18%', width: 110, height: 46 }, delay: 0.2 },
  { bg: 'rgba(130,220,200,0.08)', style: { top: '2%', left: '34%', width: 90, height: 50 }, delay: 0.15 },
  { bg: '#2e3836', accent: '#60b0a0', lines: true, style: { bottom: '4%', right: '5%', width: 120 }, delay: 1.0 },
];

function BackgroundCards() {
  return (
    <div className="bg-cards">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-card"
          style={{ ...c.style, background: c.bg, '--accent': c.accent || 'transparent', animationDelay: `${c.delay}s` }}
        >
          {c.icon && !c.label && <div className="icon" style={{ fontSize: 28 }}>{c.icon}</div>}
          {c.icon && c.label && <div className="icon">{c.icon}</div>}
          {c.label && <div className="label">{c.label}</div>}
          {c.lines && (
            <div className="lines">
              <span style={{ width: '100%' }} />
              <span />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Login View ─── */
function LoginView({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = () => {
    setError('');
    if (!email.endsWith('@ufl.edu')) {
      setError('Only @ufl.edu emails are accepted.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    console.log('Sign in:', { email });
  };

  return (
    <div className="card">
      <div className="avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1>Welcome to Chunters</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field">
        <label htmlFor="email">University email</label>
        <input id="email" type="email" placeholder="gator@ufl.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={handleSignIn}>Sign in</button>
      <button className="btn btn-outline" onClick={() => console.log('Forgot password')}>Forgot password?</button>
      <button className="btn btn-outline" onClick={() => onSwitch('signup')}>Sign up</button>
    </div>
  );
}

/* ─── Sign Up View ─── */
function SignUpView({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    setSuccess('');

    // Client-side validation
    if (!email.endsWith('@ufl.edu')) {
      setError('Only @ufl.edu emails are accepted.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      setSuccess(data.message || 'Account created! Check your email to verify.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Unable to connect to the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="17" y1="11" x2="23" y2="11" />
        </svg>
      </div>
      <h1>Create your account</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="field">
        <label htmlFor="signup-email">University email</label>
        <input id="signup-email" type="email" placeholder="gator@ufl.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="signup-confirm">Confirm password</label>
        <input id="signup-confirm" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={handleSignUp} disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <button className="btn btn-outline" onClick={() => onSwitch('login')}>Back to Sign in</button>
    </div>
  );
}

/* ─── Main App ─── */
function App() {
  const [view, setView] = useState('login');

  return (
    <div className="page">
      <BackgroundCards />
      {view === 'login' ? (
        <LoginView onSwitch={setView} />
      ) : (
        <SignUpView onSwitch={setView} />
      )}
      <div className="footer">
        Your identity stays completely anonymous.<br />
        Only @ufl.edu emails are accepted.
      </div>
    </div>
  );
}

export default App;