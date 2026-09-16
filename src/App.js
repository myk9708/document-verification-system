import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DocumentUpload from './components/DocumentUpload';
import UserDashboard from './components/UserDashboard';
import AuthorityPortal from './components/AuthorityPortal';
import IssuingAuthorityPortal from './components/IssuingAuthorityPortal';
import LoginPage from './components/LoginPage';
import { getSession, clearSession } from './api';
import './App.css';

const ROLE_LABELS = {
  individual: 'Individual',
  issuing_authority: 'Issuing Authority',
  verifying_authority: 'Verifying Authority'
};

function PortalContent({ user }) {
  switch (user.role) {
    case 'issuing_authority':
      return <IssuingAuthorityPortal user={user} />;
    case 'verifying_authority':
      return <AuthorityPortal user={user} />;
    case 'individual':
    default:
      return (
        <Routes>
          <Route path="/" element={<UserDashboard userEmail={user.email} />} />
          <Route path="/upload" element={<DocumentUpload userEmail={user.email} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
  }
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = getSession();
    if (userData) setUser(userData);
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>AI & Blockchain Document Verification</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'white', display: 'block' }}>Welcome, {user.name}</span>
              <span className={`role-badge role-${user.role}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <nav>
              <button onClick={handleLogout}>Logout</button>
            </nav>
          </div>
        </header>

        <main className="main">
          <PortalContent user={user} />
        </main>
      </div>
    </Router>
  );
}

export default App;
