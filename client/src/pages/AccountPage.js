import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundCards from '../components/layout/BackgroundCards';
import './AccountPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);

  const [displayName, setDisplayName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const [modStatus, setModStatus] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    async function fetchAccount() {
      try {
        const res = await fetch(`${API_URL}/api/auth/account`, { headers });
        if (res.status === 401) { navigate('/'); return; }
        const data = await res.json();
        if (res.ok) {
          setAccount(data.user);
          setDisplayName(data.user.displayName || '');
        }
      } catch (_) {}
    }

    async function fetchModStatus() {
      try {
        const res = await fetch(`${API_URL}/api/moderation/status`, { headers });
        if (res.ok) setModStatus(await res.json());
      } catch (_) {}
    }

    fetchAccount();
    fetchModStatus();
  }, [navigate]);

  const handleSaveName = async () => {
    setNameError(''); setNameMessage('');
    if (displayName.length > 50) {
      setNameError('Display name must be 50 characters or less.');
      return;
    }
    setNameLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/account/display-name`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) { setNameError(data.error || 'Failed to update display name.'); return; }
      setNameMessage('Display name updated.');
    } catch (_) {
      setNameError('Unable to connect to the server.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPassError(''); setPassMessage('');
    if (!currentPassword) { setPassError('Current password is required.'); return; }
    if (newPassword.length < 8) { setPassError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPassError('New passwords do not match.'); return; }
    setPassLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/update`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPassError(data.error || 'Failed to update password.'); return; }
      setPassMessage('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (_) {
      setPassError('Unable to connect to the server.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) { setDeleteError('Password is required to delete your account.'); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || 'Failed to delete account.'); return; }
      localStorage.removeItem('token');
      navigate('/');
    } catch (_) {
      setDeleteError('Unable to connect to the server.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="page">
      <BackgroundCards />
      <div className="account-card">
        <div className="account-header">
          <button className="account-back-btn" onClick={() => navigate('/threads')}>← Back to threads</button>
          <h1>Account settings</h1>
          {account && <p className="account-email">{account.email}</p>}
        </div>

        <section className="account-section">
          <h2>Display name</h2>
          <p className="account-hint">Visible to other users. Leave blank to stay fully anonymous.</p>
          {nameError && <div className="alert alert-error">{nameError}</div>}
          {nameMessage && <div className="alert alert-success">{nameMessage}</div>}
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              type="text"
              placeholder="Anonymous (leave blank)"
              value={displayName}
              maxLength={50}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSaveName} disabled={nameLoading}>
            {nameLoading ? 'Saving...' : 'Save name'}
          </button>
        </section>

        <section className="account-section">
          <h2>Change password</h2>
          {passError && <div className="alert alert-error">{passError}</div>}
          {passMessage && <div className="alert alert-success">{passMessage}</div>}
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleChangePassword} disabled={passLoading}>
            {passLoading ? 'Updating...' : 'Update password'}
          </button>
        </section>

        {modStatus && (
          <section className="account-section">
            <h2>Account standing</h2>
            <p className="account-hint">Your current moderation status on Chunters.</p>
            <div className="mod-status-row">
              <span className="mod-label">Status</span>
              <span className={`mod-badge mod-badge--${modStatus.status}`}>
                {modStatus.isBanned ? 'Banned' : 'Active'}
              </span>
            </div>
            <div className="mod-status-row">
              <span className="mod-label">Strikes</span>
              <div className="mod-strikes">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`mod-strike-dot ${i < modStatus.strikeCount ? (modStatus.isBanned ? 'mod-strike-dot--banned' : 'mod-strike-dot--active') : ''}`}
                  />
                ))}
                <span className="mod-strike-count">{modStatus.strikeCount} of 3</span>
              </div>
            </div>
            {modStatus.isBanned && modStatus.banReason && (
              <div className="mod-ban-reason">
                <span className="mod-label">Reason</span>
                <span>{modStatus.banReason}</span>
              </div>
            )}
          </section>
        )}

        <section className="account-section danger-zone">
          <h2>Account deletion</h2>
          <p className="account-hint">Deleting your account is permanent. All your threads and replies will be removed.</p>
          {!deleteConfirm ? (
            <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)}>
              Delete my account
            </button>
          ) : (
            <>
              {deleteError && <div className="alert alert-error">{deleteError}</div>}
              <div className="field">
                <label htmlFor="delete-password">Confirm with your password</label>
                <input id="delete-password" type="password" placeholder="Enter your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              </div>
              <div className="delete-actions">
                <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button className="btn btn-outline" onClick={() => { setDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default AccountPage;
