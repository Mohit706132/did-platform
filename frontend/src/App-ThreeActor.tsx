// Redesigned Three-Actor DID Platform - Indian Context
// Workflow: User requests credential → Issuer approves → User shares with Verifier
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./App.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

type UserRole = 'holder' | 'issuer' | 'verifier';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

function App() {
  // Auth state
  const [isAuth, setIsAuth] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>('holder');
  
  // UI state
  const [view, setView] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: string, msg: string } | null>(null);
  
  // Wallet state
  const [wallet, setWallet] = useState("");
  const [did, setDid] = useState("");
  
  // User (Holder) state
  const [myCredentials, setMyCredentials] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState<any>({});
  const [selectedCredential, setSelectedCredential] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  
  // Issuer state
  const [issuerProfile, setIssuerProfile] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  // Verifier state
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [myVerificationRequests, setMyVerificationRequests] = useState<any[]>([]);
  const [verifierForm, setVerifierForm] = useState<any>({});
  
  // Modals
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("session");
    if (saved) {
      const data = JSON.parse(saved);
      setIsAuth(true);
      setSessionId(data.sessionId);
      setUser(data.user);
      setWallet(data.wallet || "");
      setDid(data.did || "");
      
      // Load role-specific data
      if (data.user.role === 'holder') {
        loadUserData(data.sessionId);
      } else if (data.user.role === 'issuer') {
        loadIssuerData(data.sessionId);
      } else if (data.user.role === 'verifier') {
        loadVerifierData(data.sessionId);
      }
    }
  }, []);

  const showStatus = (type: string, msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 5000);
  };

  // ===== AUTHENTICATION =====
  const handleAuth = async () => {
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: any = { email, password };
      
      if (authMode === 'register') {
        body.firstName = firstName;
        body.lastName = lastName;
        body.role = selectedRole;
      }

      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.sessionId) {
        setIsAuth(true);
        setSessionId(data.sessionId);
        const userData = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || selectedRole,
        };
        setUser(userData);
        
        localStorage.setItem("session", JSON.stringify({
          sessionId: data.sessionId,
          user: userData,
        }));

        console.log('Logged in as:', userData.role, userData);
        showStatus("success", `Welcome ${data.firstName}!`);
        
        // Load data based on role
        if (userData.role === 'holder') {
          loadUserData(data.sessionId);
        } else if (userData.role === 'issuer') {
          loadIssuerData(data.sessionId);
        } else if (userData.role === 'verifier') {
          loadVerifierData(data.sessionId);
        }
      } else {
        showStatus("error", data.error || "Authentication failed");
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setIsAuth(false);
    setUser(null);
    setSessionId("");
    setMyCredentials([]);
    setMyRequests([]);
    setPendingRequests([]);
    setWallet("");
    setDid("");
    localStorage.removeItem("session");
    showStatus("info", "Logged out");
  };

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      showStatus("error", "Please install MetaMask");
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const addr = accounts[0];
      const userDid = `did:eth:${addr}`;
      setWallet(addr);
      setDid(userDid);
      
      // Save to localStorage
      const saved = localStorage.getItem("session");
      if (saved) {
        const data = JSON.parse(saved);
        data.wallet = addr;
        data.did = userDid;
        localStorage.setItem("session", JSON.stringify(data));
      }
      
      showStatus("success", "Wallet connected!");
    } catch (err: any) {
      showStatus("error", err.message);
    }
  };

  // ===== USER (HOLDER) FUNCTIONS =====
  const loadUserData = async (sid: string) => {
    try {
      // Fetch my credentials
      const credsRes = await fetch(`${BACKEND_URL}/api/credentials`, {
        headers: { 'x-session-id': sid },
      });
      if (credsRes.ok) {
        const data = await credsRes.json();
        setMyCredentials(data.credentials || []);
      }

      // Fetch my requests to issuers
      const reqRes = await fetch(`${BACKEND_URL}/api/user/my-requests`, {
        headers: { 'x-session-id': sid },
      });
      if (reqRes.ok) {
        const data = await reqRes.json();
        setMyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const requestDocument = async () => {
    if (!requestForm.documentType || !requestForm.issuerName) {
      showStatus("error", "Please select document type and issuer");
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        documentType: requestForm.documentType,
        issuerName: requestForm.issuerName,
        reason: requestForm.reason || 'Need this document',
        details: requestForm.details || {},
      };
      console.log('Sending document request:', requestBody);

      const res = await fetch(`${BACKEND_URL}/api/user/request-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", "Request sent to issuer!");
        console.log('Request created successfully:', data);
        setRequestForm({});
        loadUserData(sessionId);
        setView('my-requests');
      } else {
        showStatus("error", data.error);
        console.error('Request failed:', data);
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  // ===== ISSUER FUNCTIONS =====
  const loadIssuerData = async (sid: string) => {
    try {
      // Get issuer profile
      const profileRes = await fetch(`${BACKEND_URL}/api/issuer/profile`, {
        headers: { 'x-session-id': sid },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setIssuerProfile(data.issuer);
      }

      // Get pending document requests from users
      const reqRes = await fetch(`${BACKEND_URL}/api/issuer/pending-requests`, {
        headers: { 'x-session-id': sid },
      });
      if (reqRes.ok) {
        const data = await reqRes.json();
        console.log('Pending requests loaded:', data.count, 'requests');
        setPendingRequests(data.requests || []);
      } else {
        const errorData = await reqRes.json();
        console.error('Failed to load pending requests:', errorData);
      }
    } catch (err) {
      console.error('Error loading issuer data:', err);
    }
  };

  const registerIssuer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/issuer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          organizationName: requestForm.orgName,
          organizationType: requestForm.orgType || 'Government',
          country: 'India',
          authorizedCredentialTypes: requestForm.credTypes?.split(',').map((s: string) => s.trim()) || [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", "Issuer registered!");
        loadIssuerData(sessionId);
        setRequestForm({});
      } else {
        showStatus("error", data.error);
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  const approveUserRequest = async (requestId: string, credentialData: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/issuer/approve-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          requestId,
          credentialData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", "Credential issued!");
        loadIssuerData(sessionId);
        setSelectedDoc(null);
      } else {
        showStatus("error", data.error);
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  const rejectUserRequest = async (requestId: string, reason: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/issuer/reject-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ requestId, reason }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", "Request rejected");
        loadIssuerData(sessionId);
      } else {
        showStatus("error", data.error);
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  // ===== VERIFIER FUNCTIONS =====
  const loadVerifierData = async (sid: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/verifier/requests`, {
        headers: { 'x-session-id': sid },
      });
      if (res.ok) {
        const data = await res.json();
        setMyVerificationRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading verifier data:', err);
    }
  };

  const createVerificationRequest = async () => {
    if (!verifierForm.documentType || !verifierForm.purpose) {
      showStatus("error", "Please provide document type and purpose");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/verifier/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          requestedCredentialTypes: [verifierForm.documentType],
          purpose: verifierForm.purpose,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus("success", "Verification request created successfully!");
        setVerifierForm({});
        loadVerifierData(sessionId);
        setView('my-requests');
      } else {
        showStatus("error", data.error);
      }
    } catch (err: any) {
      showStatus("error", err.message);
    }
    setLoading(false);
  };

  // ===== QR CODE & SHARING =====
  const generateQRCode = async (credential: any) => {
    try {
      const shareData = JSON.stringify({
        credentialId: credential.credentialId,
        holderEmail: user?.email,
        type: credential.credentialData?.type || [],
      });
      
      const qrDataUrl = await QRCode.toDataURL(shareData, {
        width: 300,
        margin: 2,
      });
      
      setQrCodeData(qrDataUrl);
      setSelectedCredential(credential);
    } catch (err) {
      console.error('Error generating QR code:', err);
      showStatus("error", "Failed to generate QR code");
    }
  };

  const verifyCredential = async (credentialIdOrQRData: string) => {
    setLoading(true);
    try {
      let credentialId = credentialIdOrQRData;
      
      // Try to parse as JSON if it looks like QR data
      try {
        const parsed = JSON.parse(credentialIdOrQRData);
        if (parsed.credentialId) {
          credentialId = parsed.credentialId;
        }
      } catch {
        // Not JSON, use as-is
      }

      const res = await fetch(`${BACKEND_URL}/api/verifier/verify-credential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ credentialId }),
      });

      const data = await res.json();
      setVerificationResult(data);
      
      if (data.valid) {
        showStatus("success", "Credential is valid!");
      } else {
        showStatus("error", data.message || "Credential is invalid");
      }
    } catch (err: any) {
      showStatus("error", err.message);
      setVerificationResult(null);
    }
    setLoading(false);
  };

  // Get friendly document name
  const getDocumentName = (credentialData: any) => {
    if (!credentialData || !credentialData.type) return "Document";
    
    const types = Array.isArray(credentialData.type) ? credentialData.type : [credentialData.type];
    const docType = types.find((t: string) => t !== "VerifiableCredential") || types[0];
    
    // Map credential types to friendly names
    const nameMap: Record<string, string> = {
      'aadharCredential': 'Aadhaar Card',
      'panCredential': 'PAN Card',
      'dlCredential': 'Driving License',
      'AcademicCertificateCredential': 'Academic Certificate',
      'EmploymentRecordCredential': 'Employment Record',
      'MedicalRecordCredential': 'Medical Record',
    };
    
    return nameMap[docType] || docType.replace('Credential', '').replace(/([A-Z])/g, ' $1').trim();
  };

  // ===== RENDER =====
  
  if (!isAuth) {
    return (
      <div className="App">
        {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}
        
        <div className="auth-container">
          <div className="auth-card">
            <h1>🔐 DID Platform</h1>
            <p className="subtitle">Indian Digital Identity System</p>
            
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            <div className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              {authMode === 'register' && (
                <>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  
                  <div className="role-selector">
                    <label>I am a:</label>
                    <div className="role-options">
                      <label className={selectedRole === 'holder' ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="role"
                          value="holder"
                          checked={selectedRole === 'holder'}
                          onChange={() => setSelectedRole('holder')}
                        />
                        <span>👤 User</span>
                        <small>Get & share documents</small>
                      </label>
                      <label className={selectedRole === 'issuer' ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="role"
                          value="issuer"
                          checked={selectedRole === 'issuer'}
                          onChange={() => setSelectedRole('issuer')}
                        />
                        <span>🏛️ Issuer</span>
                        <small>Government/Organization</small>
                      </label>
                      <label className={selectedRole === 'verifier' ? 'selected' : ''}>
                        <input
                          type="radio"
                          name="role"
                          value="verifier"
                          checked={selectedRole === 'verifier'}
                          onChange={() => setSelectedRole('verifier')}
                        />
                        <span>✅ Verifier</span>
                        <small>Bank/Service</small>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <button onClick={handleAuth} disabled={loading} className="btn-primary">
                {loading ? 'Processing...' : authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== USER DASHBOARD =====
  if (user?.role === 'holder') {
    return (
      <div className="App">
        {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}
        
        <header className="app-header">
          <div className="header-left">
            <h1>🔐 DID Platform</h1>
            <span className="role-badge">User</span>
          </div>
          <div className="header-right">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            {!wallet ? (
              <button className="btn-sm" onClick={connectWallet}>Connect Wallet</button>
            ) : (
              <span className="wallet-badge">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
            )}
            <button className="btn-sm btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="app-layout">
          <nav className="sidebar">
            <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
              📊 Dashboard
            </button>
            <button className={view === 'my-docs' ? 'active' : ''} onClick={() => setView('my-docs')}>
              📄 My Documents
            </button>
            <button className={view === 'request-doc' ? 'active' : ''} onClick={() => setView('request-doc')}>
              ➕ Request Document
            </button>
            <button className={view === 'my-requests' ? 'active' : ''} onClick={() => setView('my-requests')}>
              📨 My Requests
            </button>
          </nav>

          <main className="main-content">
            {view === 'dashboard' && (
              <div className="dashboard-content">
                <h2>Welcome, {user.firstName}!</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-value">{myCredentials.length}</div>
                    <div className="stat-label">My Documents</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📨</div>
                    <div className="stat-value">{myRequests.filter((r: any) => r.status === 'pending').length}</div>
                    <div className="stat-label">Pending Requests</div>
                  </div>
                </div>
              </div>
            )}

            {view === 'my-docs' && (
              <div className="content-section">
                <h2>📄 My Documents</h2>
                {myCredentials.length === 0 ? (
                  <div className="empty-state">
                    <p>You don't have any documents yet.</p>
                    <button className="btn-primary" onClick={() => setView('request-doc')}>Request a Document</button>
                  </div>
                ) : (
                  <div className="credential-grid">
                    {myCredentials.map((cred: any) => (
                      <div key={cred.credentialId} className="credential-card">
                        <h3>{getDocumentName(cred.credentialData)}</h3>
                        <p className="cred-id">ID: {cred.credentialId.slice(0, 20)}...</p>
                        <p className="cred-date">Issued: {new Date(cred.issuedAt).toLocaleDateString()}</p>
                        <p className="cred-status">Status: <span className="badge-active">{cred.status}</span></p>
                        <button 
                          className="btn-sm btn-primary"
                          onClick={() => generateQRCode(cred)}
                        >
                          📱 Generate QR Code
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* QR Code Modal */}
                {qrCodeData && selectedCredential && (
                  <div className="modal-overlay" onClick={() => {setQrCodeData(""); setSelectedCredential(null);}}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <h2>Share Credential</h2>
                      <h3>{getDocumentName(selectedCredential.credentialData)}</h3>
                      <div className="qr-container">
                        <img src={qrCodeData} alt="QR Code" style={{maxWidth: '300px', margin: '1rem auto', display: 'block'}} />
                      </div>
                      <p style={{textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8'}}>
                        Scan this QR code with a verifier to share your credential
                      </p>
                      <p style={{textAlign: 'center', fontSize: '0.8rem', marginTop: '0.5rem'}}>
                        <strong>Credential ID:</strong><br/>
                        <code style={{fontSize: '0.75rem', wordBreak: 'break-all'}}>{selectedCredential.credentialId}</code>
                      </p>
                      <button className="btn-secondary" onClick={() => {setQrCodeData(""); setSelectedCredential(null);}}>
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'request-doc' && (
              <div className="content-section">
                <h2>➕ Request New Document</h2>
                <div className="form-card">
                  <div className="form-group">
                    <label>Document Type</label>
                    <select
                      value={requestForm.documentType || ''}
                      onChange={(e) => setRequestForm({ ...requestForm, documentType: e.target.value })}
                    >
                      <option value="">Select document type</option>
                      <option value="aadhar">Aadhaar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="dl">Driving License</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Issuing Authority</label>
                    <select
                      value={requestForm.issuerName || ''}
                      onChange={(e) => setRequestForm({ ...requestForm, issuerName: e.target.value })}
                    >
                      <option value="">Select issuer</option>
                      <option value="Aadhar">Aadhar (Aadhaar Card)</option>
                      <option value="UIDAI">UIDAI (Aadhaar)</option>
                      <option value="Income Tax Department">Income Tax Department (PAN)</option>
                      <option value="RTO">RTO (Driving License)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reason for Request</label>
                    <textarea
                      value={requestForm.reason || ''}
                      onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                      placeholder="Why do you need this document?"
                      rows={3}
                    />
                  </div>

                  <button className="btn-primary" onClick={requestDocument} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            )}

            {view === 'my-requests' && (
              <div className="content-section">
                <h2>📨 My Requests to Issuers</h2>
                {myRequests.length === 0 ? (
                  <div className="empty-state">No requests yet</div>
                ) : (
                  <div className="request-list">
                    {myRequests.map((req: any) => (
                      <div key={req._id} className="request-card">
                        <div className="req-header">
                          <h3>{req.documentType}</h3>
                          <span className={`status-badge status-${req.status}`}>{req.status}</span>
                        </div>
                        <p><strong>Issuer:</strong> {req.issuerName}</p>
                        <p><strong>Requested:</strong> {new Date(req.createdAt).toLocaleString()}</p>
                        {req.reason && <p><strong>Reason:</strong> {req.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ===== ISSUER DASHBOARD =====
  if (user?.role === 'issuer') {
    return (
      <div className="App">
        {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}
        
        <header className="app-header">
          <div className="header-left">
            <h1>🔐 DID Platform</h1>
            <span className="role-badge issuer">Issuer</span>
          </div>
          <div className="header-right">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            <button className="btn-sm btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="app-layout">
          <nav className="sidebar">
            <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
              📊 Dashboard
            </button>
            <button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>
              📨 Pending Requests ({pendingRequests.length})
            </button>
            <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>
              🏛️ My Profile
            </button>
          </nav>

          <main className="main-content">
            {view === 'dashboard' && (
              <div className="dashboard-content">
                {!issuerProfile ? (
                  <div className="setup-card">
                    <h2>🏛️ Register Your Organization</h2>
                    <div className="form-card">
                      <div className="form-group">
                        <label>Organization Name</label>
                        <input
                          type="text"
                          placeholder="e.g., UIDAI, RTO Maharashtra"
                          value={requestForm.orgName || ''}
                          onChange={(e) => setRequestForm({ ...requestForm, orgName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Organization Type</label>
                        <select
                          value={requestForm.orgType || ''}
                          onChange={(e) => setRequestForm({ ...requestForm, orgType: e.target.value })}
                        >
                          <option value="">Select type</option>
                          <option value="Government">Government</option>
                          <option value="Semi-Government">Semi-Government</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Authorized Document Types (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="AadharCredential, PANCredential"
                          value={requestForm.credTypes || ''}
                          onChange={(e) => setRequestForm({ ...requestForm, credTypes: e.target.value })}
                        />
                      </div>
                      <button className="btn-primary" onClick={registerIssuer} disabled={loading}>
                        {loading ? 'Registering...' : 'Register Organization'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2>Welcome, {issuerProfile.organizationName}!</h2>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon">📨</div>
                        <div className="stat-value">{pendingRequests.length}</div>
                        <div className="stat-label">Pending Requests</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {view === 'pending' && issuerProfile && (
              <div className="content-section">
                <h2>📨 Pending Document Requests</h2>
                {pendingRequests.length === 0 ? (
                  <div className="empty-state">No pending requests</div>
                ) : (
                  <div className="request-list">
                    {pendingRequests.map((req: any) => (
                      <div key={req._id} className="request-card issuer-req">
                        <h3>{req.documentType}</h3>
                        <p><strong>From:</strong> {req.userName} ({req.userEmail})</p>
                        <p><strong>Requested:</strong> {new Date(req.createdAt).toLocaleString()}</p>
                        <p><strong>Reason:</strong> {req.reason}</p>
                        
                        <div className="req-actions">
                          <button
                            className="btn-primary"
                            onClick={() => setSelectedDoc(req)}
                          >
                            Approve & Issue
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => {
                              const reason = prompt('Reason for rejection:');
                              if (reason) rejectUserRequest(req._id, reason);
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDoc && (
                  <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                      <h2>Issue {selectedDoc.documentType}</h2>
                      <p><strong>To:</strong> {selectedDoc.userName}</p>
                      
                      <div className="issue-form">
                        <h3>Fill Document Details:</h3>
                        <div className="form-group">
                          <label>Full Name</label>
                          <input
                            type="text"
                            value={requestForm.fullName || ''}
                            onChange={(e) => setRequestForm({ ...requestForm, fullName: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Document Number</label>
                          <input
                            type="text"
                            value={requestForm.docNumber || ''}
                            onChange={(e) => setRequestForm({ ...requestForm, docNumber: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="modal-actions">
                        <button
                          className="btn-primary"
                          onClick={() => approveUserRequest(selectedDoc._id, requestForm)}
                          disabled={loading}
                        >
                          {loading ? 'Issuing...' : 'Issue Credential'}
                        </button>
                        <button className="btn-secondary" onClick={() => setSelectedDoc(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'profile' && issuerProfile && (
              <div className="content-section">
                <h2>🏛️ Organization Profile</h2>
                <div className="profile-card">
                  <h3>{issuerProfile.organizationName}</h3>
                  <p><strong>Type:</strong> {issuerProfile.organizationType}</p>
                  <p><strong>Country:</strong> {issuerProfile.country}</p>
                  <p style={{marginTop: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '0.5rem'}}>
                    <strong>Note:</strong> Holders must select "<strong>{issuerProfile.organizationName}</strong>" when requesting documents from your organization.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ===== VERIFIER DASHBOARD =====
  if (user?.role === 'verifier') {
    return (
      <div className="App">
        {status && <div className={`status-banner ${status.type}`}>{status.msg}</div>}
        
        <header className="app-header">
          <div className="header-left">
            <h1>🔐 DID Platform</h1>
            <span className="role-badge verifier">Verifier</span>
          </div>
          <div className="header-right">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            <button className="btn-sm btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="app-layout">
          <nav className="sidebar">
            <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
              📊 Dashboard
            </button>
            <button className={view === 'verify' ? 'active' : ''} onClick={() => setView('verify')}>
              ✅ Verify Credential
            </button>
            <button className={view === 'create-request' ? 'active' : ''} onClick={() => setView('create-request')}>
              ➕ Create Request
            </button>
            <button className={view === 'my-requests' ? 'active' : ''} onClick={() => setView('my-requests')}>
              📋 My Requests
            </button>
          </nav>

          <main className="main-content">
            {view === 'dashboard' && (
              <div className="dashboard-content">
                <h2>Verifier Dashboard</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📨</div>
                    <div className="stat-value">{myVerificationRequests.length}</div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">
                      {myVerificationRequests.filter((r: any) => r.status === 'pending').length}
                    </div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">
                      {myVerificationRequests.filter((r: any) => r.status === 'verified').length}
                    </div>
                    <div className="stat-label">Verified</div>
                  </div>
                </div>
              </div>
            )}

            {view === 'verify' && (
              <div className="content-section">
                <h2>✅ Verify Credential</h2>
                <div className="form-card">
                  <div className="form-group">
                    <label>Credential ID or QR Data</label>
                    <input
                      type="text"
                      placeholder="Paste credential ID or scan QR code data..."
                      value={verifierForm.credentialId || ''}
                      onChange={(e) => setVerifierForm({ ...verifierForm, credentialId: e.target.value })}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (verifierForm.credentialId) {
                        verifyCredential(verifierForm.credentialId);
                      } else {
                        showStatus("error", "Please enter a credential ID");
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify Credential'}
                  </button>
                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`verification-result ${verificationResult.valid ? 'valid' : 'invalid'}`}
                       style={{
                         marginTop: '2rem',
                         padding: '1.5rem',
                         borderRadius: '0.5rem',
                         background: verificationResult.valid ? '#10b981' : '#ef4444',
                         color: 'white'
                       }}>
                    <h3>{verificationResult.valid ? '✅ Valid Credential' : '❌ Invalid Credential'}</h3>
                    <p style={{marginTop: '0.5rem'}}>{verificationResult.message}</p>
                    
                    {verificationResult.valid && verificationResult.credential && (
                      <div style={{marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.375rem'}}>
                        <p><strong>Document:</strong> {getDocumentName({type: verificationResult.credential.type})}</p>
                        <p><strong>Holder:</strong> {verificationResult.credential.holder?.name} ({verificationResult.credential.holder?.email})</p>
                        <p><strong>Issuer:</strong> {verificationResult.credential.issuer?.name}</p>
                        <p><strong>Issued:</strong> {new Date(verificationResult.credential.issuedAt).toLocaleDateString()}</p>
                        {verificationResult.credential.expiresAt && (
                          <p><strong>Expires:</strong> {new Date(verificationResult.credential.expiresAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === 'create-request' && (
              <div className="content-section">
                <h2>➕ Create Verification Request</h2>
                <div className="form-card">
                  <div className="form-group">
                    <label>Document Type</label>
                    <select
                      value={verifierForm.documentType || ''}
                      onChange={(e) => setVerifierForm({ ...verifierForm, documentType: e.target.value })}
                    >
                      <option value="">Select document type...</option>
                      <option value="Identity Proof">Identity Proof</option>
                      <option value="Academic Certificate">Academic Certificate</option>
                      <option value="Employment Record">Employment Record</option>
                      <option value="Medical Record">Medical Record</option>
                      <option value="Financial Statement">Financial Statement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Purpose of Verification</label>
                    <textarea
                      placeholder="Explain why you need to verify this document..."
                      rows={4}
                      value={verifierForm.purpose || ''}
                      onChange={(e) => setVerifierForm({ ...verifierForm, purpose: e.target.value })}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    onClick={createVerificationRequest}
                    disabled={loading || !verifierForm.documentType || !verifierForm.purpose}
                  >
                    {loading ? 'Sending...' : 'Create Verification Request'}
                  </button>
                </div>
              </div>
            )}

            {view === 'my-requests' && (
              <div className="content-section">
                <h2>📋 My Verification Requests</h2>
                {myVerificationRequests.length === 0 ? (
                  <div className="empty-state">
                    <p>No verification requests yet</p>
                    <button className="btn-primary" onClick={() => setView('create-request')}>
                      Create Your First Request
                    </button>
                  </div>
                ) : (
                  <div className="requests-grid">
                    {myVerificationRequests.map((req: any) => (
                      <div key={req._id || req.requestId} className="request-card">
                        <div className="request-header">
                          <span className={`status-badge ${req.status}`}>
                            {req.status}
                          </span>
                        </div>
                        <h3>{req.requestedCredentialTypes ? req.requestedCredentialTypes.join(', ') : 'N/A'}</h3>
                        <p><strong>Purpose:</strong> {req.purpose}</p>
                        <p className="request-date">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
