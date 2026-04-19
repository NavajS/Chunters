import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundCards from '../components/layout/BackgroundCards';
import './loginPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async () => {
    setError('');
    setSuccess('');
    setDevResetLink('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to request password reset.');
        return;
      }

      setSuccess(data.message || 'If an account exists for this email, a reset link has been sent.');
      setDevResetLink(data.resetLink || '');
    } catch (err) {
      setError('Unable to connect to the server.');
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
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <h1>Reset password</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {devResetLink && (
          <div className="alert alert-success">
            Dev reset link: <a href={devResetLink}>{devResetLink}</a>
          </div>
        )}

        <div className="field">
          <label htmlFor="reset-email">University email</label>
          <input
            id="reset-email"
            type="email"
            placeholder="gator@ufl.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleRequestReset} disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>Back to Sign in</button>
      </div>

      <div className="footer">
        If your account exists and is verified,<br />
        you will receive a reset link by email.
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
