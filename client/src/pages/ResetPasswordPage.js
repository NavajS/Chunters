import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackgroundCards from '../components/layout/BackgroundCards';
import './SignUpView.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

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
      const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Unable to reset password.');
        return;
      }

      setSuccess(data.message || 'Password reset successful.');
      setPassword('');
      setConfirmPassword('');
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
            <path d="M12 17a5 5 0 0 0 5-5V7a5 5 0 0 0-10 0v5a5 5 0 0 0 5 5z" />
            <path d="M5 21h14" />
          </svg>
        </div>

        <h1>Choose new password</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleResetPassword} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>Back to Sign in</button>
      </div>

      <div className="footer">
        Keep your account secure with a strong password.
      </div>
    </div>
  );
}

export default ResetPasswordPage;
