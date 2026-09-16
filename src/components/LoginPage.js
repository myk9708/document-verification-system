import React, { useState } from 'react';
import { apiFetch, saveSession } from '../api';

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  margin: '0.5rem 0',
  border: '1px solid #ddd',
  borderRadius: '5px',
  fontSize: '1rem'
};

function LoginPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isSignUp ? '/api/register' : '/api/login';
      const payload = isSignUp ? { email, password, name, role } : { email, password };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        const userData = {
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          isLoggedIn: true
        };
        saveSession(result.token || null, userData);
        onLogin(userData);
      } else {
        alert(result.error || 'Authentication failed');
      }
    } catch (error) {
      alert('Connection error: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI & Blockchain Document Verification</h1>
      </header>

      <main className="main">
        <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <h2>{isSignUp ? 'Create Account' : 'Login'}</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            {isSignUp ? 'Join our secure document verification platform' : 'Access your document verification dashboard'}
          </p>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  required
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={inputStyle}
                >
                  <option value="individual">Individual</option>
                  <option value="issuing_authority">Issuing Authority</option>
                  <option value="verifying_authority">Verifying Authority</option>
                </select>
              </>
            )}

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />

            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Login')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="ai-analysis" style={{ marginTop: '2rem' }}>
            <h4>Secure Platform Features</h4>
            <p>• AI-powered document verification</p>
            <p>• Blockchain-secured records</p>
            <p>• Authority-approved certificates</p>
            <p>• Instant verification sharing</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
