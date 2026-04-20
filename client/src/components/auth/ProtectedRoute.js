import React from 'react';
import { Navigate } from 'react-router-dom';

// Guards routes by redirecting unauthenticated users back to sign-in.
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
