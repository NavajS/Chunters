import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundCards from '../components/layout/BackgroundCards';
import './loginPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    setError('');

   if (!email.trim().toLowerCase().endsWith('@ufl.edu')) {
      setError('Only @ufl.edu emails are accepted.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      localStorage.setItem('token', data.token);
      console.log('Login successful:', data);
    } catch (err) {
      setError('Unable to connect to the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <BackgroundCards />

      <div className="card">
        <div className="avatar">
          {}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            {}
            <line x1="22" y1="1" x2="2" y2="22" strokeWidth="2.8" />
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

        <button className="btn btn-primary" onClick={handleSignIn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <button className="btn btn-outline" onClick={() => console.log('Forgot password')}>Forgot password?</button>
        <button className="btn btn-outline" onClick={() => navigate('/signup')}>Sign up</button>
      </div>

      <div className="footer">
        Your identity stays completely anonymous.<br />
        Only @ufl.edu emails are accepted.
      </div>
    </div>
  );
}

export default LoginPage;