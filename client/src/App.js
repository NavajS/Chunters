import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/loginPage';
import SignUpPage from './pages/SignUpView';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Threadspage from './pages/Threadspage';
import ThreadDetailPage from './pages/ThreadDetailPage';
import AccountPage from './pages/AccountPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Defines top-level route mapping for auth, feed, thread detail, and account screens.
function App() {
  return (
    <Router>
      <Routes>
        {/* Public authentication and recovery screens shown before sign-in. */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        {/* Protected community feed and thread interaction screens. */}
        <Route
          path="/threads"
          element={(
            <ProtectedRoute>
              <Threadspage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/threads/:threadId"
          element={(
            <ProtectedRoute>
              <ThreadDetailPage />
            </ProtectedRoute>
          )}
        />
        {/* Protected account settings and moderation status screen. */}
        <Route
          path="/account"
          element={(
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Router>
  );
}

export default App;
