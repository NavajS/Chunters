import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundCards from '../components/layout/BackgroundCards';
import './SignUpView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devVerificationLink, setDevVerificationLink] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setError('');
    setSuccess('');
    setDevVerificationLink('');

    if (!email.trim().toLowerCase().endsWith('@ufl.edu')) {
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
      setDevVerificationLink(data.verificationLink || '');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (_err) {
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
        {devVerificationLink && (
          <div className="alert alert-success">
            Dev verify link: <a href={devVerificationLink}>{devVerificationLink}</a>
          </div>
        )}

        <div className="field">
          <label htmlFor="signup-email">University email</label>
          <input id="signup-email" type="email" placeholder="gator@ufl.edu" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" type="password" placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input id="signup-confirm" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={handleSignUp} disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>Back to Sign in</button>
      </div>

      <div className="footer">
        Your identity stays completely anonymous.<br />
        Only @ufl.edu emails are accepted.
      </div>
    </div>
  );
}

export default SignUpPage;
