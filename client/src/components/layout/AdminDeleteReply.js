import React, { useState } from 'react';
import './AdminDeleteButton.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function AdminDeleteReply({ postId, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to delete reply.');
        return;
      }

      if (onDeleted) onDeleted(postId);
    } catch (err) {
      alert('Unable to connect to the server.');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="admin-delete-confirm">
        <span className="admin-delete-label">Delete?</span>
        <button className="admin-delete-yes" onClick={handleDelete} disabled={loading}>
          {loading ? '...' : 'Yes'}
        </button>
        <button className="admin-delete-no" onClick={() => setConfirming(false)}>No</button>
      </span>
    );
  }

  return (
    <button className="admin-delete-btn" onClick={() => setConfirming(true)}>
      Delete
    </button>
  );
}

export default AdminDeleteReply;