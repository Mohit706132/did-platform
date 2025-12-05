# 🎯 Authentication & Document Flow - Visual Diagrams

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALICE'S COMPLETE JOURNEY                           │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: SIGN UP
════════════════════════════════════════════════════════════════════════════════

1. REGISTRATION
   Alice                          Frontend                    Backend (MongoDB)
   ├─ Opens app                      │                             │
   ├─ Clicks "Sign Up"              │                             │
   │                                 │                             │
   └─ Enters:                        │                             │
      ├─ Email: alice@...           │                             │
      ├─ Password: ****             │                             │
      └─ Name: Alice Smith           │                             │
                                     │                             │
                                 POST /auth/register              │
                              {email, password, name}            │
                                     ├───────────────────────────>│
                                     │                     hashPassword()
                                     │                     INSERT users
                                     │                             │
                                     │<─────────────────────────── │
                                     │ {userId, sessionId}         │
                                     │                             │
                                 ✅ Session Created              │
                                 ✅ User registered              │
                                 ⏱️  1 hour expiration           │

2. WALLET LINKING
   Alice                          Frontend                    Backend
   ├─ Clicks "Link Wallet"         │                          │
   │                                │                          │
   ├─ "Open MetaMask" prompt       │                          │
   │  [MetaMask shows up]           │                          │
   │  ├─ Alice's wallet: 0xAlice  │                          │
   │  └─ Alice confirms            │                          │
   │                                │                          │
   └─ "Sign this message":         │                          │
      "Verify wallet ownership"    │                          │
      └─ Alice clicks "Sign"       │                          │
         └─ Signature generated    │                          │
                                    │                          │
                             POST /auth/wallet/link           │
                        {walletAddress, signature}            │
                                    ├─────────────────────────>│
                                    │              recoverAddress()
                                    │              Verify: 0xAlice ✅
                                    │              Create DID
                                    │              did:mychain:0xAlice
                                    │              INSERT user_wallets
                                    │              registerDID() → blockchain
                                    │                          │
                                    │<─────────────────────────│
                                    │ {walletAddress, did}    │
                                    │                          │
                                ✅ Wallet verified           │
                                ✅ DID created               │
                                ✅ Registered on blockchain  │

RESULT: Alice's account fully set up with verified wallet


PHASE 2: LOGIN
════════════════════════════════════════════════════════════════════════════════

3. FIRST-TIME LOGIN
   Alice                          Frontend                    Backend
   ├─ Opens app again              │                          │
   │  (new browser/device)          │                          │
   │                                │                          │
   ├─ Clicks "Log In"              │                          │
   │                                │                          │
   └─ Enters:                      │                          │
      ├─ Email: alice@...          │                          │
      └─ Password: ****            │                          │
                                    │                          │
                                POST /auth/login              │
                             {email, password}                │
                                    ├─────────────────────────>│
                                    │          Find user by email
                                    │          verifyPassword() ✅
                                    │          sessionManager.
                                    │            createSession()
                                    │          Return: sessionId
                                    │                          │
                                    │<─────────────────────────│
                                    │ {sessionId, userId,     │
                                    │  walletAddress: 0xAlice,│
                                    │  did: did:...:0xAlice}  │
                                    │                          │
                               ✅ Logged in!                  │
                               ✅ Session: 1 hour             │
                               ✅ Stored in sessionStorage    │

4. AUTO-CONNECT METAMASK (Optional but cool!)
   Alice                          Frontend                    MetaMask
   ├─ Page loads                   │                          │
   │  (sessionId in storage)        │                          │
   │                                │                          │
   │  Frontend checks:              │                          │
   │  ├─ Do we have sessionId? ✅  │                          │
   │  ├─ walletAddress in storage? │                          │
   │  │  Yes: 0xAlice              │                          │
   │  └─ Is MetaMask installed?     │                          │
   │     Yes!                        │                          │
   │                                │                          │
   │                            eth_requestAccounts()         │
   │                                ├──────────────────────────>│
   │                                │ "App wants to connect"   │
   │                                │ Current wallet: 0xAlice  │
   │                                │ [Auto-confirmed if user │
   │                                │  previously allowed]     │
   │                                │                          │
   │                                │<──────────────────────────│
   │                                │ [0xAlice]               │
   │                                │                          │
   │ Frontend checks:               │                          │
   │ ├─ currentWallet == 0xAlice? │                          │
   │ │  YES! ✅                    │                          │
   │ └─ Show: "✅ Wallet Connected"│                          │
   │                                │                          │
   └─ ✅ Alice ready to go!        │                          │

5. LOAD CREDENTIALS
   Frontend (after login)          Backend
   │                               │
   ├─ GET /credentials             │
   │   Headers: {sessionId}        │
   │   Parameters: {userId}        │
   │                               │
   │───────────────────────────────>│
   │                        Verify sessionId ✅
   │                        Query credentials where:
   │                        ├─ subjectId == userId
   │                        ├─ status == "ACTIVE"
   │                        └─ expiresAt > now()
   │                               │
   │<──────────────────────────────│
   │ [                             │
   │   {                           │
   │     credentialId: "cred-1",  │
   │     type: "Education",       │
   │     issuer: "university",    │
   │     subject: "0xAlice",      │
   │     status: "ACTIVE",        │
   │     usageCount: 0,           │
   │     claims: {...}            │
   │   },                         │
   │   {...more creds...}         │
   │ ]                           │
   │                               │
   ✅ Display credentials on Alice's dashboard

RESULT: Alice logged in + MetaMask connected + Credentials loaded


PHASE 3: SHARE & VERIFY
════════════════════════════════════════════════════════════════════════════════

6. GENERATE QR CODE
   Alice (on her dashboard)       Frontend
   ├─ Sees credentials list        │
   │  ├─ Education Credential      │
   │  ├─ Work Experience           │
   │  └─ Skills Cert               │
   │                                │
   ├─ Clicks "Share" on Education  │
   │  Credential                    │
   │                                │
   └─ Frontend:                     │
      ├─ Takes credential data     │
      ├─ Adds: credentialId,       │
      │         subjectDid,        │
      │         timestamp          │
      │                             │
      ├─ Generates QR code with    │
      │  qrcode.js library         │
      │                             │
      └─ Shows on screen:           │
         ┌─────────────────┐        │
         │   [QR CODE]     │        │
         │   Scan to verify│        │
         └─────────────────┘        │

   Alice can:
   ├─ Display QR on screen
   ├─ Print it out
   ├─ Share screenshot
   └─ Send link to employer

7. EMPLOYER SCANS & REQUESTS SIGNATURE
   Employer                       Frontend (Alice)      Backend
   ├─ Opens verifier app          │                       │
   ├─ Scans Alice's QR code       │                       │
   │  [Receives credential data]  │                       │
   │                               │                       │
   ├─ Submits for verification    │                       │
   │                               │                       │
   │                           POST /verify              │
   │                        {credential, ...)            │
   │                               ├──────────────────────>│
   │                               │        But wait!
   │                               │   Need to prove Alice owns this!
   │                               │        Ask frontend to sign
   │                               │
   │                           GET /verify/request        │
   │                        {credentialId}                │
   │                               │<──────────────────────│
   │                               │ {challenge: "..."}   │
   │                               │
   │ Frontend receives challenge   │
   │ Shows to Alice:               │
   │ "Employer wants to verify     │
   │  your credential.             │
   │  MetaMask will ask you to     │
   │  sign a message."             │
   │                               │
   └─ Alice clicks "Approve"       │
      ├─ MetaMask opens            │
      ├─ Shows message:             │
      │  "Sign this verification"  │
      │  [Signature generated]      │
      │                             │
      │                         POST /verify/confirm
      │                   {credentialId, signature}
      │                             ├──────────────────────>│
      │                             │  recoverAddress()
      │                             │  Verify sig from 0xAlice ✅
      │                             │  credentialSubject == 0xAlice ✅
      │                             │                        │
      │                             │  [7 Security Checks]   │
      │                             │  ✅ Issuer valid       │
      │                             │  ✅ Not expired        │
      │                             │  ✅ Not revoked        │
      │                             │  ✅ Status = ACTIVE    │
      │                             │  ✅ Subject matches    │
      │                             │  ✅ Holder signature ✅│
      │                             │  ✅ Fresh timestamp    │
      │                             │                        │
      │                             │  UPDATE credentials    │
      │                             │  SET status = "USED"   │
      │                             │  INSERT usage_log      │
      │                             │                        │
      │                             │<──────────────────────│
      │                             │ ✅ VERIFIED           │
      │                             │ {credentialData}      │
      │                             │
      └─ ✅ Verification Success!
         Employer sees:
         ├─ Name: Alice Smith
         ├─ Degree: BS Computer Science
         └─ ✅ Verified on Dec 6, 2:35 PM

RESULT: Credential verified securely + Usage logged


SCENARIO: BOB TRIES FRAUD
════════════════════════════════════════════════════════════════════════════════

8. BOB INTERCEPTS CREDENTIAL
   
   Bob (attacker)
   ├─ Somehow gets Alice's QR code
   │  (screenshot, printed paper, etc)
   │
   └─ Tries to use it:
      ├─ Opens verifier app
      ├─ Scans QR (gets Alice's credential)
      ├─ Submits for verification
      │
      └─ Frontend asks: "Sign to prove you own this"
         ├─ Bob's MetaMask shows: 0xBob
         ├─ Bob signs with 0xBob wallet
         │
         └─ Sends to backend:
            {
              credential: {...Alice's credential...},
              signature: "0xBobSignature",
              presenterDid: "did:mychain:0xBob"  ← BOB!
            }

9. BACKEND DETECTS FRAUD
   
   Backend receives Bob's request
   │
   ├─ Security Check 1-5: Pass ✅
   │  (Issuer valid, not expired, not revoked, etc)
   │
   ├─ Security Check 6: Holder signature
   │  ├─ Recover address from signature
   │  ├─ Got: 0xBob
   │  ├─ Expected: 0xAlice (credential.subject)
   │  ├─ Match? ❌ NO!
   │  │
   │  └─ HALT: "Holder is 0xAlice, but you're 0xBob"
   │
   └─ Result: ❌ VERIFICATION FAILED
      ├─ Log failed attempt:
      │  INSERT credential_usage_log {
      │    credentialId: "cred-1",
      │    presenterId: "did:mychain:0xBob",  ← FRAUD!
      │    result: "FAILED",
      │    reason: "Holder mismatch",
      │    ipAddress: "192.168.1.100"
      │  }
      │
      ├─ Alert: "Possible credential fraud detected!"
      └─ Admin notified ⚠️

   Employer sees:
   └─ ❌ VERIFICATION FAILED
      "This credential was issued to Alice, not you"

   Result: BOB'S FRAUD ATTEMPT BLOCKED! 🛡️
   ├─ Audit log created
   ├─ Administrator notified
   └─ Investigation possible from usage logs

```

---

## Session & Activity Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   SESSION LIFECYCLE                          │
└──────────────────────────────────────────────────────────────┘

Creation (Login)
   │
   ├─ Time: 2:30 PM
   ├─ SessionId: "SES-abc123"
   ├─ TTL: 1 hour
   ├─ Expiration: 3:30 PM
   └─ createdAt: 2:30 PM
      lastActivity: 2:30 PM

         ↓

Alice uses her account (2:35 PM)
   │
   ├─ Gets credentials
   ├─ lastActivity updated: 2:35 PM
   ├─ Expiration extended: 3:35 PM
   └─ Inactivity timeout reset: 15 min

         ↓

Alice inactive (2:45 PM - 3:00 PM)
   │
   ├─ No requests for 15 minutes
   ├─ Next request at 3:00 PM
   ├─ Inactivity timeout: 15 min
   ├─ Current time: 3:00 PM
   ├─ Last activity: 2:45 PM
   ├─ Inactive for: 15 minutes
   │
   └─ Session invalidated! ❌
      Reason: Inactivity timeout exceeded
      Alice must login again

         OR

Alice actively using (2:40 PM - 3:20 PM)
   │
   ├─ Continuous activity
   ├─ lastActivity: always updated
   ├─ Expiration: always 1 hour from now
   ├─ Inactivity timeout: always reset
   │
   └─ Session continues ✅

         ↓

No more activity
   │
   ├─ Last activity: 3:20 PM
   ├─ No requests until 3:40 PM
   ├─ But 1-hour TTL at 3:30 PM expired
   │
   ├─ At 3:40 PM, session invalid ❌
   │  Reason: Session expired (1 hour)
   │
   └─ Alice must login again

RULES:
1. Session TTL: 1 hour from creation
2. Activity extends expiration: 1 hour from now
3. Inactivity timeout: 15 minutes
4. If inactive 15 min: Session invalid
5. If past 1 hour from creation: Session invalid
6. Logout: Immediately invalid
```

---

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                          │
└────────────────────────────────────────────────────────────────┘

FRONTEND (React)
├─ Auth Context: { sessionId, userId, wallet, did }
├─ User Dashboard
├─ Credential List with QR
└─ Settings

      ↓ POST requests
      
BACKEND API (Express)
├─ Auth Service
│  ├─ /auth/register → hashPassword() → MongoDB
│  ├─ /auth/login → verifyPassword() → sessionManager
│  ├─ /auth/wallet/challenge → walletVerifier
│  └─ /auth/wallet/verify → recoverAddress()
│
├─ Credential Service
│  ├─ /credentials/issue → issuerService → auditLogger
│  ├─ /credentials → Query MongoDB
│  ├─ /credentials/verify → verifyService → 7 checks
│  └─ /credentials/revoke → revokeCredential()
│
└─ Session Management
   ├─ sessionManager.getSession() → Check expiration
   ├─ sessionManager.extendSession() → Update TTL
   └─ sessionManager.invalidateSession() → Cleanup

      ↓ Database operations

MONGODB (Data Store)
├─ users { email, passwordHash, passwordSalt }
├─ user_wallets { walletAddress, did, isVerified }
├─ sessions { sessionId, userId, expiresAt, lastActivity }
├─ credentials { credentialId, status, usageCount }
├─ credential_usage_log { presenterId, result, timestamp }
└─ credential_revocations { credentialId, revokedAt }

      ↓ Smart contract calls (via ethers.js)

BLOCKCHAIN (Hardhat/Ethereum)
├─ DIDRegistry.sol
│  ├─ registerDID(did, documentUri)
│  ├─ resolveDID(address)
│  ├─ setCredentialStatus(credId, revoked)
│  └─ isCredentialRevoked(credId)
│
└─ Immutable audit trail
   ├─ All DIDs registered
   ├─ All revocations tracked
   └─ Publicly verifiable ✅
```

---

## Security Checks Visualization

```
┌────────────────────────────────────────────────────────────┐
│          VERIFICATION SECURITY CHECK PIPELINE              │
└────────────────────────────────────────────────────────────┘

Employer submits credential for verification

         ↓
    
    ┌─────────────────────┐
    │ CHECK 1: Issued by  │
    │ known issuer?       │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌─────────────────────┐
    │ CHECK 2: Issuer     │
    │ signature valid?    │
    │ (verify JWT)        │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌─────────────────────┐
    │ CHECK 3: Not        │
    │ expired?            │
    │ (expiresAt > now)   │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌─────────────────────┐
    │ CHECK 4: Not        │
    │ revoked on-chain?   │
    │ (blockchain query)  │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌─────────────────────┐
    │ CHECK 5: Status in  │
    │ DB = ACTIVE?        │
    │ (not already used)  │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌─────────────────────┐
    │ CHECK 6: Holder     │
    │ signature valid?    │
    │ (matches subject)   │
    └─────────────────────┘
           ↓ ✅ Pass (Alice signed)
           │ ❌ Fail (Bob signed)
           │       └─ FRAUD DETECTED!
    
    ┌─────────────────────┐
    │ CHECK 7: Message    │
    │ timestamp fresh?    │
    │ (within 5 minutes)  │
    └─────────────────────┘
           ↓ ✅ Pass
    
    ┌──────────────────────────┐
    │  ✅ ALL CHECKS PASSED!   │
    │                          │
    │  Update DB:              │
    │  status = "USED"         │
    │  usageCount = 1          │
    │                          │
    │  Insert audit log:       │
    │  result = "SUCCESS"      │
    │  timestamp = now()       │
    │                          │
    │  Return to Employer:     │
    │  ✅ VERIFIED             │
    │  credentialData = {...}  │
    └──────────────────────────┘
```

---

## One-Time Usage Enforcement

```
┌──────────────────────────────────────────────────────────┐
│       ONE-TIME CREDENTIAL LIFECYCLE (Security)           │
└──────────────────────────────────────────────────────────┘

ISSUANCE (University issues credential)
   │
   ├─ credentialId: "cred-1"
   ├─ subject: "did:mychain:0xAlice"
   ├─ status: "ACTIVE"        ← Can be used now
   ├─ usageCount: 0
   └─ maxUsages: 1             ← ONE TIME ONLY!
      
         ↓

FIRST VERIFICATION (Alice presents to Employer1)
   │
   ├─ [7 security checks pass]
   ├─ ✅ Status == "ACTIVE"? → YES
   ├─ ✅ usageCount < maxUsages? → 0 < 1? YES
   │
   ├─ Update database:
   │  ├─ SET status = "USED"
   │  ├─ SET usageCount = 1
   │  └─ Updated database
   │
   ├─ Insert usage log:
   │  ├─ presenterId: "did:mychain:0xAlice"
   │  ├─ verifierId: "employer1.did"
   │  ├─ result: "SUCCESS"
   │  └─ timestamp: "2025-12-06T14:35:00Z"
   │
   ├─ Blockchain: Mark as used/revoked (optional)
   │
   └─ Return to Employer1: ✅ VERIFIED

         ↓

SECOND ATTEMPT (Bob tries same credential)
   │
   ├─ [First 5 security checks: Pass]
   ├─ ✅ Issuer valid
   ├─ ✅ Not expired
   ├─ ✅ Not revoked
   ├─ ✅ Subject == issuer
   │
   ├─ CHECK 5: Status?
   │  ├─ Query database
   │  ├─ Status: "USED" (NOT "ACTIVE")
   │  └─ ❌ FAIL! Already used!
   │
   ├─ Insert failed log:
   │  ├─ presenterId: "did:mychain:0xBob"
   │  ├─ result: "ALREADY_USED"
   │  └─ timestamp: "2025-12-06T14:40:00Z"
   │
   ├─ Alert: Potential fraud!
   │
   └─ Return to Bob: ❌ FAILED
      "Credential already used on Dec 6 at 2:35 PM"

         ↓

AUDIT TRAIL
   │
   ├─ Successfully used: 1 time ✅
   │  └─ By: Alice, to: Employer1, at: 2:35 PM
   │
   ├─ Failed attempts: 1
   │  └─ By: Bob, from: 192.168.1.100, at: 2:40 PM
   │
   └─ Status: USED (can never be used again)

LIFETIME ATTEMPTS:
   ├─ Attempt 1: ✅ SUCCESS (Alice)
   ├─ Attempt 2: ❌ BLOCKED (Bob)
   ├─ Attempt 3: ❌ BLOCKED
   ├─ Attempt 4: ❌ BLOCKED
   └─ ... forever: ❌ BLOCKED
   
   One credential = One use = One legitimate owner
```

This visual system shows exactly how your DID platform prevents:
- ✅ Credential theft (holder binding)
- ✅ Credential reuse (one-time usage)
- ✅ Impersonation (DID verification)
- ✅ Fraud (7-point security checks)
- ✅ Complete audit trail (usage logs)
