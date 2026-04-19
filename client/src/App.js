import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/loginPage';
import SignUpPage from './pages/SignUpView';
import Threadspage from './pages/Threadspage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/threads" element={<PrivateRoute><Threadspage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
