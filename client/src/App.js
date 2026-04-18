import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/loginPage';
import SignUpPage from './pages/SignUpView';
import Threadspage from './pages/Threadspage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/threads" element={<Threadspage />} />
      </Routes>
    </Router>
  );
}

export default App;