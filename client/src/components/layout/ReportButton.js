import React, { useState } from 'react';
import './ReportButton.css';

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech',
  'Spam or misleading',
  'Self-harm or dangerous content',
  'Personal information exposed',
  'Other',
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

function ReportButton({ threadId, postId, onPostRemoved }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleReport = async () => {
    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason || finalReason.trim().length < 5) {
      setError('Please select or enter a reason (at least 5 characters).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        postId
          ? `${API_URL}/api/threads/${threadId}/posts/${postId}/report`
          : `${API_URL}/api/threads/${threadId}/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: finalReason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit report.');
        return;
      }

      setResult(data);

      if ((data.postRemoved || data.threadRemoved) && onPostRemoved) {
    onPostRemoved(postId);
    }
    } catch (err) {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setReason('');
    setCustomReason('');
    setError('');
    setResult(null);
  };

  return (
    <>
      <button className="report-btn" onClick={() => setShowModal(true)}>
        Report
      </button>

      {showModal && (
        <div className="report-overlay" onClick={handleClose}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            {result ? (
              <>
                <h3 className="report-title">Report submitted</h3>
                <p className="report-success">
                  {result.message || 'Thank you for helping keep Chunters safe.'}
                  {result.postRemoved && ' This post has been taken down due to multiple reports.'}
                </p>
                <button className="report-close-btn" onClick={handleClose}>Close</button>
              </>
            ) : (
              <>
                <h3 className="report-title">Report this post</h3>
                <p className="report-subtitle">Why are you reporting this content?</p>

                {error && <div className="report-error">{error}</div>}

                <div className="report-reasons">
                  {REPORT_REASONS.map((r) => (
                    <label key={r} className={`report-reason ${reason === r ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      {r}
                    </label>
                  ))}
                </div>

                {reason === 'Other' && (
                  <textarea
                    className="report-custom"
                    placeholder="Please describe the issue (at least 5 characters)..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                  />
                )}

                <div className="report-actions">
                  <button className="report-cancel" onClick={handleClose}>Cancel</button>
                  <button className="report-submit" onClick={handleReport} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ReportButton;