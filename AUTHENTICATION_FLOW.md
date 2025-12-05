# 🔐 Authentication & Document Flow - Complete Guide

## Your System Explanation

Your understanding is **mostly correct, but with important clarifications**. Let me explain your system and what's different:

---

## ✅ What You Understood Correctly

### 1. **User Registration & Login (Email + Password)**
```
User Signs Up:
├─ Email: alice@example.com
├─ Password: (hashed with PBKDF2)
└─ Stored in MongoDB

User Logs In:
├─ Email + Password
├─ System verifies credentials
├─ Creates session token
└─ User authenticated ✅
```
**Status:** ✅ We have this infrastructure ready

---

### 2. **MetaMask Wallet Linking**
```
During Sign Up (or Later):
├─ User connects MetaMask wallet
├─ System creates DID: did:mychain:0xWalletAddress
├─ Wallet address linked to user account
└─ User can manage documents for this wallet

After Login:
├─ MetaMask auto-connects if enabled
├─ Loads all credentials issued for this wallet
└─ User can share/revoke them
```
**Status:** ✅ We have wallet challenge-response system ready

---

### 3. **Share Document via QR Code**
```
Alice's Credential:
├─ University issues credential
├─ Alice can download it
├─ Alice generates QR code containing credential
├─ Alice shows QR to Employer

Employer:
├─ Scans QR code
├─ Gets credential data
├─ Verifies with backend
└─ Gets verification result ✅
```
**Status:** ✅ Credential structure ready (QR generation is simple frontend task)

---

## ⚠️ Critical Difference: Holder Binding (Security)

### **Your Current Understanding (Missing Security):**
```
Alice downloads credential
Alice shows it to Employer
Employer verifies: "Issuer signed this?" ✅
Result: VERIFIED ✅

Problem: Bob steals Alice's credential file
Bob shows same credential to Employer
Employer verifies: "Issuer signed this?" ✅ (still true!)
Result: VERIFIED ✅ (WRONG - This is Bob, not Alice!)
```

### **Our Solution: Holder Binding (Signing)**
```
Alice downloads credential
Alice wants to share it with Employer
System asks: "Sign to prove you own this credential"
├─ Alice uses MetaMask to sign
├─ Signature proves: "I (0xAlice) am presenting this credential"
└─ Signature is added to the presentation

Employer receives: credential + Alice's signature
Employer verifies TWO things:
├─ 1. Issuer signed credential? ✅ (University signature valid)
└─ 2. Presenter signed proof? ✅ (Alice's wallet signature valid)

Result: ✅ VERIFIED (Definitely Alice)

Bob tries the SAME thing:
Bob shows credential + tries to sign as Bob
├─ Issuer signature: ✅ (University did sign it)
├─ Presenter signature: ❌ (Signed by 0xBob, but credential says 0xAlice!)
└─ Mismatch: "Holder is 0xAlice, but you claim to be 0xBob"

Result: ❌ REJECTED (This is fraud!)
```

---

## 📊 Complete Architecture for Your System

### **Phase 1: User Authentication (Sign Up)**

```
FLOW: Email/Password Registration → Wallet Linking

┌─────────────────────────────────────────────────────────┐
│ Step 1: Email Registration                              │
├─────────────────────────────────────────────────────────┤
│ User enters: email, password                             │
│ Backend:                                                 │
│   ├─ Validate email format                              │
│   ├─ Hash password: hashPassword(password)              │
│   ├─ Create user: INSERT INTO users                     │
│   └─ Create session: INSERT INTO sessions               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: Wallet Linking (MetaMask)                       │
├─────────────────────────────────────────────────────────┤
│ User clicks: "Link Wallet"                              │
│ Frontend:                                                │
│   ├─ Prompts MetaMask                                   │
│   ├─ Gets wallet address: 0xAlice                       │
│   └─ Asks user to sign challenge message                │
│       Message: "Verify wallet ownership for DID"        │
│                                                          │
│ User sees in MetaMask: "Sign this message"              │
│ User clicks: "Sign"                                     │
│ Frontend gets signature from MetaMask                   │
│                                                          │
│ Backend (recoverAddress from signature):                │
│   ├─ Verifies signature is from 0xAlice ✅             │
│   ├─ Creates DID: did:mychain:0xAlice                  │
│   ├─ Registers on blockchain: registerDID()            │
│   ├─ Stores in MongoDB:                                │
│   │   INSERT INTO user_wallets {                        │
│   │     userId: "user-uuid",                            │
│   │     walletAddress: "0xAlice",                       │
│   │     did: "did:mychain:0xAlice",                     │
│   │     isVerified: true,                               │
│   │     verificationSignature: "0x..."                  │
│   │   }                                                 │
│   └─ Returns: ✅ Wallet linked!                        │
└─────────────────────────────────────────────────────────┘

RESULT: User account created + Wallet verified + DID registered
```

### **Phase 2: User Login**

```
FLOW: Email/Password Login → Session Created → Auto-load wallet

┌─────────────────────────────────────────────────────────┐
│ Step 1: Email/Password Login                            │
├─────────────────────────────────────────────────────────┤
│ User enters: email, password                             │
│ Frontend: POST /auth/login                              │
│                                                          │
│ Backend:                                                 │
│   ├─ Look up user by email                              │
│   ├─ verifyPassword(password, hash, salt)               │
│   ├─ ✅ Password matches → Continue                    │
│   ├─ Create session: sessionId = "SES-uuid"             │
│   ├─ Return: {                                          │
│   │   sessionId: "SES-uuid",                            │
│   │   userId: "user-uuid",                              │
│   │   walletAddress: "0xAlice",                         │
│   │   did: "did:mychain:0xAlice",                       │
│   │   email: "alice@example.com"                        │
│   │ }                                                   │
│   └─ Expiration: 1 hour (auto-refreshes on activity)   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: Frontend Auto-connect MetaMask (Optional)       │
├─────────────────────────────────────────────────────────┤
│ Frontend (on page load):                                │
│   ├─ Has stored: walletAddress = "0xAlice"             │
│   ├─ Checks: Is MetaMask installed?                     │
│   ├─ If yes: eth_requestAccounts                        │
│   ├─ Gets: currentWallet = "0xAlice"                    │
│   └─ If currentWallet == walletAddress:                │
│       └─ ✅ Auto-connected! Wallet synced             │
│                                                          │
│ If user switched wallets in MetaMask:                   │
│   └─ ⚠️ Warning: "Wrong wallet connected"              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 3: Load User's Credentials                         │
├─────────────────────────────────────────────────────────┤
│ Frontend: GET /credentials?userId=user-uuid             │
│                                                          │
│ Backend:                                                 │
│   ├─ Verify session is valid (not expired)             │
│   ├─ Query database:                                    │
│   │   SELECT * FROM credentials                        │
│   │   WHERE subjectId = "user-uuid"                     │
│   │   AND status = "ACTIVE"                             │
│   │                                                     │
│   ├─ Returns: [                                         │
│   │   {                                                 │
│   │     id: "cred-1",                                   │
│   │     issuer: "did:mychain:university",               │
│   │     subject: "did:mychain:0xAlice",                │
│   │     credentialType: "EducationCredential",          │
│   │     claims: {name: "Alice", degree: "CS"},          │
│   │     status: "ACTIVE",                               │
│   │     usageCount: 0,                                  │
│   │     issuedAt: "2025-12-06T10:00:00Z",              │
│   │     expiresAt: "2026-12-06T10:00:00Z"              │
│   │   },                                                │
│   │   {...more credentials...}                          │
│   │ ]                                                   │
└─────────────────────────────────────────────────────────┘

RESULT: User logged in + Session active + All credentials loaded
```

### **Phase 3: Document Sharing & QR Code**

```
FLOW: Generate QR Code → Share Credential → Verify

┌─────────────────────────────────────────────────────────┐
│ Step 1: User Generates QR Code                          │
├─────────────────────────────────────────────────────────┤
│ Alice (logged in):                                      │
│   ├─ Clicks: "Share This Credential"                   │
│   └─ Frontend generates QR code containing:             │
│       {                                                 │
│         credentialId: "cred-1",                         │
│         subjectDid: "did:mychain:0xAlice",             │
│         issuerDid: "did:mychain:university",           │
│         credentialData: {...full credential...},        │
│         shareToken: "share-token-abc123"                │
│       }                                                 │
│                                                          │
│   QR Code can be:                                       │
│   ├─ Displayed on screen                               │
│   ├─ Printed on paper                                  │
│   ├─ Sent via email/SMS                                │
│   └─ Embedded in digital document                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: Employer Scans QR Code                          │
├─────────────────────────────────────────────────────────┤
│ Employer (Bob):                                         │
│   ├─ Opens verifier app                                │
│   ├─ Scans QR code with phone                          │
│   ├─ Gets credential data from QR                      │
│   └─ Submits to backend for verification               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 3: Backend Verification (CRITICAL!)                │
├─────────────────────────────────────────────────────────┤
│ Employer Backend: POST /verify                          │
│ Request:                                                │
│ {                                                       │
│   credential: {...credential data...},                 │
│   presentationToken: "share-token-abc123",             │
│   presenterDid: "did:mychain:0xAlice",                │
│   timestamp: 1701907800000                             │
│ }                                                       │
│                                                          │
│ Backend performs 7 security checks:                     │
│   ✅ 1. Issuer signature valid?                        │
│        └─ verifyService.verifyCredential()             │
│   ✅ 2. Credential not expired?                        │
│        └─ Check expiresAt > now()                      │
│   ✅ 3. Credential not revoked?                        │
│        └─ Query blockchain: isCredentialRevoked()      │
│   ✅ 4. Credential status = "ACTIVE"?                  │
│        └─ Check database status field                  │
│   ✅ 5. Subject DID = Presenter DID?                   │
│        └─ credential.subject == presenterDid           │
│   ✅ 6. Token is fresh (within 5 minutes)?             │
│        └─ now() - timestamp < 5 minutes                │
│   ✅ 7. Usage count allows?                            │
│        └─ usageCount < maxUsages (1 for one-time)     │
│                                                          │
│ If ALL checks pass:                                     │
│   ├─ Update database: status = "USED", usageCount = 1 │
│   ├─ Log usage:                                         │
│   │   INSERT INTO credential_usage_log {               │
│   │     credentialId: "cred-1",                        │
│   │     presenterId: "did:mychain:0xAlice",           │
│   │     verifierId: "did:mychain:employer",           │
│   │     ipAddress: "203.0.113.45",                     │
│   │     result: "SUCCESS",                             │
│   │     timestamp: now()                               │
│   │   }                                                 │
│   └─ Return: ✅ VERIFIED                              │
│                                                          │
│ If ANY check fails:                                     │
│   ├─ Log failed attempt                                │
│   ├─ Alert: Possible fraud attempt                     │
│   └─ Return: ❌ FAILED with reason                    │
└─────────────────────────────────────────────────────────┘

RESULT: Credential verified + Database updated + Audit trail created
```

---

## 🗄️ MongoDB Schema You Need

```javascript
// Users Collection
db.users.insertOne({
  _id: ObjectId("user-uuid"),
  email: "alice@example.com",
  passwordHash: "pbkdf2$...", // Hashed with salt
  passwordSalt: "random-salt-hex",
  phoneNumber: "+1234567890",
  createdAt: new Date("2025-12-06"),
  verifiedAt: new Date("2025-12-06"),
  lastLogin: new Date("2025-12-06T14:30:00Z"),
  
  // Settings
  mfaEnabled: false,
  twoFactorSecret: null,
  preferredLanguage: "en"
})

// User Wallets Collection
db.user_wallets.insertOne({
  _id: ObjectId("wallet-uuid"),
  userId: ObjectId("user-uuid"),
  walletAddress: "0xAlice123...",
  did: "did:mychain:0xAlice123",
  publicKey: "0x04abc...", // Secp256k1 public key
  encryptedPrivateKey: null, // If self-hosted (null if only MetaMask)
  isVerified: true,
  verificationSignature: "0xsignature...", // Signed during linking
  chain: "ethereum", // or "hardhat" for localhost
  createdAt: new Date("2025-12-06"),
  linkedAt: new Date("2025-12-06"),
  lastUsed: new Date("2025-12-06T14:30:00Z")
})

// Sessions Collection
db.sessions.insertOne({
  _id: ObjectId("session-uuid"),
  sessionId: "SES-uuid-12345",
  userId: ObjectId("user-uuid"),
  walletAddress: "0xAlice123", // Linked wallet for this session
  token: "jwt-token-xyz...",
  expiresAt: new Date("2025-12-06T15:30:00Z"), // 1 hour from creation
  createdAt: new Date("2025-12-06T14:30:00Z"),
  lastActivity: new Date("2025-12-06T14:30:00Z"),
  ipAddress: "203.0.113.45",
  userAgent: "Mozilla/5.0...",
  isValid: true
})

// Credentials Collection
db.credentials.insertOne({
  _id: ObjectId("cred-uuid"),
  credentialId: "cred-uuid-12345",
  issuerId: ObjectId("issuer-user-uuid"), // University
  subjectId: ObjectId("user-uuid"), // Alice
  subjectDid: "did:mychain:0xAlice",
  
  // Credential content
  credentialData: {
    "@context": "https://www.w3.org/2018/credentials/v1",
    id: "urn:uuid:cred-uuid-12345",
    type: ["VerifiableCredential", "EducationCredential"],
    issuer: "did:mychain:university",
    issuanceDate: "2025-12-06T10:00:00Z",
    expirationDate: "2026-12-06T10:00:00Z",
    credentialSubject: {
      id: "did:mychain:0xAlice",
      name: "Alice Smith",
      degree: "Bachelor of Science",
      major: "Computer Science",
      graduationDate: "2025-12-01"
    },
    proof: {
      type: "JsonWebSignature2020",
      jwt: "eyJhbGc..." // Signed by issuer
    }
  },
  
  // One-time credential tracking
  status: "ACTIVE", // or "USED" or "REVOKED"
  usageCount: 0,
  maxUsages: 1, // For one-time credentials
  
  // Metadata (Bug #23)
  metadata: {
    purpose: "employment_verification",
    credentialType: "EducationCredential",
    tags: ["verified", "diploma", "2025"],
    createdAt: "2025-12-06T10:00:00Z",
    issuedBy: "did:mychain:university"
  },
  
  // Timestamps
  issuedAt: new Date("2025-12-06T10:00:00Z"),
  expiresAt: new Date("2026-12-06T10:00:00Z"),
  createdAt: new Date("2025-12-06T10:00:00Z"),
  updatedAt: new Date("2025-12-06T10:00:00Z")
})

// Credential Usage Log Collection (Audit Trail)
db.credential_usage_log.insertOne({
  _id: ObjectId("log-uuid"),
  credentialId: "cred-uuid-12345",
  presenterId: "did:mychain:0xAlice",
  verifierId: "did:mychain:employer",
  presentationId: "pres-uuid-456",
  
  // Request info
  ipAddress: "203.0.113.45",
  userAgent: "Mozilla/5.0...",
  
  // Result
  verificationResult: "SUCCESS", // or "FAILED", "ALREADY_USED", "REVOKED"
  failureReason: null, // Reason if FAILED
  
  // Security details
  issuerSignatureValid: true,
  holderSignatureValid: true,
  subjectDidMatches: true,
  statusValid: true,
  notExpired: true,
  notRevoked: true,
  
  // Timestamp
  timestamp: new Date("2025-12-06T14:35:00Z"),
  
  // Optional: Reference to blockchain
  onChainVerification: {
    txHash: "0xabc123...",
    blockNumber: 123456,
    timestamp: 1701907800
  }
})

// Credential Revocations Collection
db.credential_revocations.insertOne({
  _id: ObjectId("revocation-uuid"),
  credentialId: "cred-uuid-12345",
  revokedBy: ObjectId("issuer-user-uuid"),
  
  reason: "Credential compromised", // or "Credentials expired", etc.
  revokedAt: new Date("2025-12-06T15:00:00Z"),
  
  // Reference to blockchain transaction
  onChainTxHash: "0xdef456...",
  blockNumber: 123457
})
```

---

## 🔄 API Endpoints You Need to Build

### **Authentication Endpoints**

```typescript
// POST /auth/register
Request: {
  email: "alice@example.com",
  password: "SecurePassword123",
  firstName: "Alice",
  lastName: "Smith"
}
Response: {
  userId: "user-uuid",
  email: "alice@example.com",
  sessionId: "SES-uuid",
  message: "Registration successful. Please link your wallet."
}

// POST /auth/login
Request: {
  email: "alice@example.com",
  password: "SecurePassword123"
}
Response: {
  userId: "user-uuid",
  sessionId: "SES-uuid",
  walletAddress: "0xAlice",
  did: "did:mychain:0xAlice",
  expiresAt: "2025-12-06T15:30:00Z"
}

// POST /auth/logout
Request: {
  sessionId: "SES-uuid"
}
Response: {
  message: "Logged out successfully"
}

// POST /auth/wallet/challenge
Request: {
  walletAddress: "0xAlice"
}
Response: {
  challengeId: "WCHALL-uuid",
  message: "Please sign this message to verify wallet ownership:\nChallenge: nonce\nTimestamp: 1701903600000",
  expiresAt: "2025-12-06T14:35:00Z"
}

// POST /auth/wallet/verify
Request: {
  challengeId: "WCHALL-uuid",
  signature: "0xsignature...",
  walletAddress: "0xAlice"
}
Response: {
  verified: true,
  walletAddress: "0xAlice",
  did: "did:mychain:0xAlice",
  message: "Wallet verified and linked"
}

// POST /auth/wallet/link
Request: {
  sessionId: "SES-uuid",
  walletAddress: "0xAlice",
  signature: "0xsignature..." // From challenge
}
Response: {
  walletAddress: "0xAlice",
  did: "did:mychain:0xAlice",
  isVerified: true,
  linkedAt: "2025-12-06T10:00:00Z"
}
```

### **Credential Endpoints**

```typescript
// POST /credentials/issue
Request: {
  sessionId: "SES-uuid",
  subjectDid: "did:mychain:0xAlice",
  claims: {
    name: "Alice Smith",
    degree: "BS Computer Science",
    graduationDate: "2025-12-01"
  },
  credentialType: "EducationCredential",
  expirationDate: "2026-12-06T10:00:00Z",
  metadata: {
    purpose: "employment_verification",
    tags: ["diploma", "verified"]
  }
}
Response: {
  credentialId: "cred-uuid-12345",
  credential: {...full credential with proof...},
  status: "ACTIVE",
  qrCode: "data:image/png;base64,..." // Optional: embedded QR
}

// GET /credentials?userId=user-uuid
Response: [
  {
    credentialId: "cred-1",
    type: "EducationCredential",
    issuer: "did:mychain:university",
    subject: "did:mychain:0xAlice",
    status: "ACTIVE",
    usageCount: 0,
    issuedAt: "2025-12-06T10:00:00Z",
    expiresAt: "2026-12-06T10:00:00Z"
  },
  {...more credentials...}
]

// GET /credentials/:credentialId
Response: {
  ...full credential with proof...
}

// POST /credentials/verify
Request: {
  credential: {...},
  presenterDid: "did:mychain:0xAlice",
  timestamp: 1701907800000
}
Response: {
  valid: true,
  message: "Credential verified successfully",
  credentialData: {
    name: "Alice Smith",
    degree: "BS Computer Science"
  },
  verificationDetails: {
    issuerValid: true,
    holderValid: true,
    notExpired: true,
    notRevoked: true,
    statusActive: true
  }
}

// POST /credentials/:credentialId/revoke
Request: {
  sessionId: "SES-uuid",
  reason: "Credential compromised"
}
Response: {
  credentialId: "cred-uuid-12345",
  status: "REVOKED",
  revokedAt: "2025-12-06T15:00:00Z",
  onChainTxHash: "0xabc123..."
}

// GET /credentials/:credentialId/usage-log
Response: [
  {
    presenterId: "did:mychain:0xAlice",
    verifierId: "did:mychain:employer",
    result: "SUCCESS",
    timestamp: "2025-12-06T14:35:00Z",
    ipAddress: "203.0.113.45"
  },
  {...more usage entries...}
]
```

---

## 📋 Next Steps to Build

### **Phase 1: Database & Authentication (2-3 days)**
1. ✅ Set up MongoDB with collections
2. ✅ Build `/auth/register` endpoint
3. ✅ Build `/auth/login` endpoint
4. ✅ Build `/auth/wallet/challenge` endpoint
5. ✅ Build `/auth/wallet/verify` endpoint
6. ✅ Implement session middleware

### **Phase 2: Credential Management (2-3 days)**
1. ✅ Build `/credentials/issue` endpoint
2. ✅ Build `/credentials` (list) endpoint
3. ✅ Build `/credentials/verify` endpoint
4. ✅ Implement one-time usage tracking
5. ✅ Implement audit logging

### **Phase 3: Frontend Integration (3-4 days)**
1. ✅ Build signup form with email/password
2. ✅ Build wallet linking flow (MetaMask)
3. ✅ Build credential list with QR code generation
4. ✅ Build verification page (for employer)
5. ✅ Handle sessions and auto-login

### **Phase 4: Security & Testing (2-3 days)**
1. ✅ Test one-time credential enforcement
2. ✅ Test credential expiration
3. ✅ Test revocation flow
4. ✅ Test wallet ownership verification
5. ✅ Security audit

---

## Summary: Your System

| Component | Your Understanding | Our Implementation |
|-----------|-------------------|-------------------|
| Registration | Email + Password | ✅ Email + Password (hashed) |
| Wallet Linking | MetaMask | ✅ MetaMask with signature verification |
| Auto-login | Load credentials | ✅ Session + auto-load credentials |
| Share Document | QR Code | ✅ QR Code (frontend generation) |
| Verification | Employer verifies | ✅ Backend verification + 7 security checks |
| **Difference** | **Not secure** | **Holder binding** (signature prevents theft) |
| Prevent Fraud | Hope nobody copies | ✅ One-time usage + signature enforcement |

**Your system is exactly right, but with the critical addition of holder binding (wallet signatures) to prevent credential theft!**
