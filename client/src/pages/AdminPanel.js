import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function AdminPanel() {
  const navigate = useNavigate();
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const getToken = () => localStorage.getItem('token');

  // Check if user is admin from their JWT
  const getUserRole = () => {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    } catch {
      return null;
    }
  };

  const fetchBannedUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/admin/banned-users`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load banned users.');
      }

      setBannedUsers(data.bannedUsers || []);
    } catch (err) {
      setError(err.message || 'Unable to load banned users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (userId, email) => {
    setActionMessage('');
    try {
      const response = await fetch(`${API_URL}/api/admin/unban/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unban user.');
      }

      setActionMessage(data.message || `${email} has been unbanned.`);
      setBannedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.message || 'Failed to unban user.');
    }
  };

  useEffect(() => {
    const role = getUserRole();
    if (role !== 'admin') {
      navigate('/threads');
      return;
    }
    fetchBannedUsers();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };
console.log('AdminPanel rendering, role:', getUserRole(), 'loading:', loading, 'error:', error);
  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin panel</h1>
            <p className="admin-subtitle">Manage banned users</p>
          </div>
          <button className="admin-back-btn" onClick={() => navigate('/threads')}>
            Back to threads
          </button>
        </div>

        {error && <div className="admin-alert error">{error}</div>}
        {actionMessage && <div className="admin-alert success">{actionMessage}</div>}

        {loading && <div className="admin-message">Loading banned users...</div>}

        {!loading && bannedUsers.length === 0 && (
          <div className="admin-message">No banned users.</div>
        )}

        {!loading && bannedUsers.length > 0 && (
          <div className="admin-list">
            {bannedUsers.map((user) => (
              <div key={user.id} className="admin-user-card">
                <div className="admin-user-info">
                  <div className="admin-user-avatar">
                    {(user.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="admin-user-email">{user.email}</div>
                    <div className="admin-user-meta">
                      Banned {formatDate(user.banned_at)} · {user.strike_count} strikes
                    </div>
                    <div className="admin-user-reason">{user.ban_reason}</div>
                  </div>
                </div>
                <button
                  className="admin-unban-btn"
                  onClick={() => handleUnban(user.id, user.email)}
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;