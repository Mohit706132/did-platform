// Modern App.tsx with improved UI and authentication
import React, { useEffect, useState } from "react";
import "./App.css";
import { getCurrentAddress } from "./blockchain/didRegistry";
import { DID_METHOD_PREFIX } from "./blockchain/config";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

interface User {
  email: string;
  firstName: string;
  lastName: string;
}

function App() {
  // Auth
  const [isAuth, setIsAuth] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Wallet
  const [wallet, setWallet] = useState("");
  const [did, setDid] = useState("");
  
  // UI
  const [view, setView] = useState<'dashboard' | 'credentials' | 'verify'>('dashboard');
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: string, msg: string } | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("session");
    if (saved) {
      const data = JSON.parse(saved);
      setSessionId(data.sessionId);
      setUser(data.user);
      setIsAuth(true);
      loadCreds(data.sessionId);
    }
  }, []);

  const msg = (type: string, msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleAuth = async () => {
    if (authMode === 'register' && (!firstName || !lastName)) {
      return msg('error', 'Please fill all fields');
    }
    if (!email || !password) return msg('error', 'Email and password required');

    try {
      setLoading(true);
      const url = `/api/auth/${authMode}`;
      const body = authMode === 'register' 
        ? { email, password, firstName, lastName }
        : { email, password };

      const res = await fetch(BACKEND_URL + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Auth failed');
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setUser(data.user || { email, firstName, lastName });
      setIsAuth(true);
      localStorage.setItem("session", JSON.stringify({ sessionId: data.sessionId, user: data.user || { email, firstName, lastName } }));
      msg('success', authMode === 'register' ? 'Account created!' : 'Logged in!');
      setEmail(""); setPassword(""); setFirstName(""); setLastName("");
      loadCreds(data.sessionId);
    } catch (e: any) {
      msg('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(BACKEND_URL + '/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-id': sessionId }
      });
    } catch {}
    setIsAuth(false);
    setSessionId("");
    setUser(null);
    setCredentials([]);
    setWallet("");
    setDid("");
    localStorage.removeItem("session");
    msg('info', 'Logged out');
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      const addr = await getCurrentAddress();
      setWallet(addr);
      setDid(`${DID_METHOD_PREFIX}${addr}`);
      msg('success', 'Wallet connected!');
    } catch (e: any) {
      msg('error', e.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const loadCreds = async (sid: string) => {
    try {
      const res = await fetch(BACKEND_URL + '/api/credentials?page=1&limit=50', {
        headers: { 'x-session-id': sid }
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (e) {}
  };

  const issueCred = async () => {
    if (!did && !wallet) return msg('error', 'Connect wallet first');

    try {
      setLoading(true);
      const res = await fetch(BACKEND_URL + '/api/credentials/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({
          subjectDid: did || `${DID_METHOD_PREFIX}${wallet}`,
          claims: {
            name: `${user?.firstName} ${user?.lastName}`,
            email: user?.email,
            role: "Student"
          },
          type: ["VerifiableCredential", "EducationCredential"]
        })
      });

      if (!res.ok) throw new Error('Issue failed');
      msg('success', 'Credential issued!');
      loadCreds(sessionId);
    } catch (e: any) {
      msg('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCred = async () => {
    if (!verifyInput.trim()) return msg('error', 'Paste credential JSON');

    try {
      setLoading(true);
      const parsed = JSON.parse(verifyInput);
      const res = await fetch(BACKEND_URL + '/api/credentials/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify(parsed)
      });

      if (!res.ok) throw new Error('Verify failed');
      const result = await res.json();
      setVerifyResult(result);
      msg(result.valid ? 'success' : 'error', result.valid ? 'Valid!' : 'Invalid: ' + result.reason);
    } catch (e: any) {
      msg('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="app-root">
        {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}
        <div className="auth-container">
          <div className="auth-card">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>🔐 DID Platform</h2>
            <div className="auth-tabs">
              <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Login</button>
              <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>Register</button>
            </div>
            {authMode === 'register' && (
              <>
                <div className="form-group">
                  <label>First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleAuth} disabled={loading}>
              {loading && <span className="loading"></span>}
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>🔐 DID Platform</h1>
        <p>Decentralized Identity & Verifiable Credentials</p>
      </header>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="button-group">
            <button className={`btn ${view === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('dashboard')}>🏠 Dashboard</button>
            <button className={`btn ${view === 'credentials' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('credentials')}>📋 Credentials</button>
            <button className={`btn ${view === 'verify' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('verify')}>✅ Verify</button>
          </div>
          <button className="btn btn-secondary" onClick={logout}>🚪 Logout</button>
        </div>
      </div>

      {view === 'dashboard' && (
        <>
          <div className="dashboard-grid">
            <div className="stat-card">
              <h3>Total Credentials</h3>
              <div className="stat-value">{credentials.length}</div>
            </div>
            <div className="stat-card">
              <h3>Active</h3>
              <div className="stat-value">{credentials.filter(c => c.status === 'ACTIVE').length}</div>
            </div>
            <div className="stat-card">
              <h3>Wallet</h3>
              <div className="stat-value">{wallet ? '🟢' : '🔴'}</div>
            </div>
          </div>

          <div className="card">
            <h2>👤 Profile</h2>
            <div className="user-info">
              <div className="user-info-item">
                <span className="user-info-label">Name</span>
                <span className="user-info-value">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="user-info-item">
                <span className="user-info-label">Email</span>
                <span className="user-info-value">{user?.email}</span>
              </div>
              {wallet && (
                <div className="user-info-item">
                  <span className="user-info-label">Wallet</span>
                  <span className="user-info-value">{wallet.slice(0, 10)}...{wallet.slice(-8)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>🚀 Quick Actions</h2>
            <div className="button-group">
              {!wallet && <button className="btn btn-primary" onClick={connectWallet} disabled={loading}>🔗 Connect Wallet</button>}
              <button className="btn btn-success" onClick={issueCred} disabled={loading || !wallet}>📜 Issue Credential</button>
              <button className="btn btn-secondary" onClick={() => setView('credentials')}>📋 View All</button>
            </div>
          </div>
        </>
      )}

      {view === 'credentials' && (
        <div className="card">
          <h2>📋 My Credentials</h2>
          {credentials.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No credentials yet</div>
              <button className="btn btn-primary" onClick={issueCred}>Issue Credential</button>
            </div>
          ) : (
            <div className="credentials-list">
              {credentials.map(c => (
                <div key={c.credentialId} className="credential-item">
                  <div className="credential-header">
                    <div className="credential-title">{c.credentialData?.type?.[1] || 'Verifiable Credential'}</div>
                    <span className={`credential-status ${c.status.toLowerCase()}`}>{c.status}</span>
                  </div>
                  <div className="credential-meta">
                    <div className="credential-meta-item">
                      <div className="credential-meta-label">Issued</div>
                      <div className="credential-meta-value">{new Date(c.issuedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setModal(c)} style={{ marginTop: '1rem' }}>View Details</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'verify' && (
        <div className="card">
          <h2>✅ Verify Credential</h2>
          <div className="form-group">
            <label>Credential JSON</label>
            <textarea style={{ minHeight: '300px', fontFamily: 'monospace' }} value={verifyInput} onChange={e => setVerifyInput(e.target.value)} placeholder='{"@context": ...}' />
          </div>
          <button className="btn btn-primary" onClick={verifyCred} disabled={loading}>🔍 Verify</button>
          {verifyResult && (
            <div className={`alert ${verifyResult.valid ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '1rem' }}>
              <strong>{verifyResult.valid ? '✅ Valid' : '❌ Invalid'}</strong>
              {!verifyResult.valid && <p>Reason: {verifyResult.reason}</p>}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Credential Details</h3>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <pre>{JSON.stringify(modal, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
