# 📊 System Architecture Overview

## Your Platform at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                    YOUR DID PLATFORM                                 │
│                  (Decentralized Identity)                            │
└─────────────────────────────────────────────────────────────────────┘

LAYER 1: USER AUTHENTICATION
════════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Sign Up      │  Email: alice@example.com
│ Email+Pass   │  Password: ******* (hashed)
│ (MongoDB)    │  
└──────────┬───┘
           │
           └──> User Account Created ✅
                │
                ├─ ID: user-uuid
                ├─ Email: unique
                └─ Password: HASHED (never plaintext!)


LAYER 2: WALLET LINKING
════════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Link         │  MetaMask: 0xAlice123...
│ Wallet       │  Sign message: "Verify ownership"
│ MetaMask     │  Signature proves: "I control this wallet"
└──────────┬───┘
           │
           └──> Wallet Verified ✅
                │
                ├─ Wallet Address: 0xAlice123
                ├─ DID: did:mychain:0xAlice123
                ├─ On-Chain: Registered in DIDRegistry
                └─ Linked to: user-uuid


LAYER 3: LOGIN & AUTO-CONNECT
════════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Log In       │  Email: alice@example.com
│ Email+Pass   │  Password: ****
│              │  
└──────────┬───┘
           │
           ├──> Password verified ✅
           │
           ├──> Session created (1 hour TTL)
           │
           └──> MetaMask auto-connects
                ├─ Check: Is MetaMask installed?
                ├─ Check: Do we have stored wallet? (0xAlice123)
                ├─ Check: Is this wallet in MetaMask now?
                └─ Result: ✅ Auto-connected!


LAYER 4: LOAD CREDENTIALS
════════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Dashboard    │  Query: All credentials where
│ Shows:       │  ├─ subject = alice@example.com
│ • Education  │  ├─ status = "ACTIVE"
│ • Work Exp   │  └─ expiresAt > now()
│ • Skills     │
└──────────┬───┘
           │
           └──> [
                  {
                    credentialId: "cred-edu-1",
                    type: "EducationCredential",
                    issuer: "University",
                    subject: "did:mychain:0xAlice",
                    status: "ACTIVE",
                    claims: {
                      degree: "BS Computer Science",
                      graduationDate: "2025-12-01"
                    }
                  },
                  {...more credentials...}
                ]


LAYER 5: SHARE VIA QR CODE
════════════════════════════════════════════════════════════════════════
┌──────────────┐
│ Click        │  QR Code Generated
│ "Share"      │  Contains:
│ Button       │  ├─ credentialId
│              │  ├─ credentialData
│ Shows QR     │  ├─ subject DID
│ on Screen    │  ├─ issuer DID
│              │  └─ timestamp
└──────────┬───┘
           │
           ├──> Display on screen
           ├──> Print on paper
           ├──> Share screenshot
           └──> Send via email/SMS


LAYER 6: VERIFICATION (The Security Layer!)
════════════════════════════════════════════════════════════════════════

Employer scans QR → Gets credential data

Backend asks Alice: "Who are you?"
└──> "Sign this message with MetaMask"

Alice signs: Signature created by 0xAlice's wallet

Backend verifies (7 checks):
┌─────────────────────────┐
│ ✅ Check 1: Issuer OK  │ University signed this? YES
│ ✅ Check 2: Signature  │ University signature valid? YES
│ ✅ Check 3: Not Expired│ Still within validity period? YES
│ ✅ Check 4: Not Revoked│ Not on blockchain revocation list? YES
│ ✅ Check 5: Status OK  │ Database says ACTIVE? YES
│ ✅ Check 6: Holder OK  │ Signed by did:mychain:0xAlice? YES ← KEY!
│ ✅ Check 7: Fresh      │ Timestamp within 5 min? YES
└─────────────────────────┘

RESULT: ✅ ALL PASS = VERIFIED!

Update database:
├─ status = "USED" (one-time enforced)
├─ usageCount = 1
└─ Log: Alice verified at Employer on Dec 6

Employer sees:
├─ ✅ VERIFIED
├─ Name: Alice Smith
├─ Degree: BS Computer Science
└─ Issued by: University


LAYER 7: FRAUD PREVENTION (One-Time + Signature)
════════════════════════════════════════════════════════════════════════

Bob steals Alice's QR code (screenshot, printout, etc.)

Bob tries to use it:
├─ Scans QR → Gets Alice's credential
├─ MetaMask asks: Sign to verify
├─ Bob signs with 0xBob's wallet
└─ Signature: Created by 0xBob

Backend verification:
┌─────────────────────────┐
│ ✅ Check 1-5: PASS      │ Issuer valid, not expired, etc.
│ ✅ Check 6: Holder      │ Signed by: 0xBob
│                         │ Expected: 0xAlice
│ ❌ MISMATCH!            │
└─────────────────────────┘

ALSO:
┌─────────────────────────┐
│ ❌ Check 5: Status      │ Database says: "USED"
│                         │ (Alice already used it)
│ ❌ ALREADY USED!        │
└─────────────────────────┘

RESULT: ❌ VERIFICATION FAILED

Log: Fraud attempt by 0xBob detected
Alert: Administrator notified

Bob sees:
└─ ❌ VERIFICATION FAILED
   "Holder is Alice, but you're Bob"
   "This credential was already used"


LAYER 8: AUDIT TRAIL (Complete History)
════════════════════════════════════════════════════════════════════════

For credential "cred-edu-1":

ISSUANCE:
├─ Issued by: University
├─ To: Alice (did:mychain:0xAlice)
├─ Date: 2025-12-06 10:00 AM
└─ Status: ACTIVE

SUCCESSFUL USE:
├─ Presented by: Alice
├─ Verified by: Google (Employer1)
├─ Date: 2025-12-06 2:35 PM
├─ IP: 203.0.113.45
└─ Result: SUCCESS

FRAUD ATTEMPT:
├─ Attempted by: Bob
├─ Tried at: Company2
├─ Date: 2025-12-06 2:40 PM
├─ IP: 192.168.1.100
├─ Reason: Holder mismatch (0xAlice vs 0xBob)
└─ Result: FAILED

NEVER USED AGAIN:
├─ Status: USED (permanently)
├─ Remaining uses: 0
└─ Can never be used: Even if revocation is undone


BLOCKCHAIN LAYER (Immutable Record)
════════════════════════════════════════════════════════════════════════

┌──────────────────────────────────┐
│ Ethereum/Hardhat Blockchain      │
├──────────────────────────────────┤
│                                  │
│ DIDRegistry Smart Contract       │
│ ├─ Alice's DID registered        │
│ ├─ University DID registered     │
│ ├─ Credential revocation status  │
│ └─ All queryable publicly        │
│                                  │
│ Immutable Benefits:              │
│ ├─ DIDs can't be faked           │
│ ├─ Revocations are permanent     │
│ ├─ Public verification possible  │
│ └─ No central authority needed   │
└──────────────────────────────────┘
```

---

## Component Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                   COMPONENT INTERACTION MAP                       │
└──────────────────────────────────────────────────────────────────┘

USER (Alice)
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Pages:                                                            │
│ ├─ /signup - Email/Password form                                │
│ ├─ /wallet-setup - MetaMask linking                             │
│ ├─ /login - Email/Password auth                                 │
│ ├─ /dashboard - Credentials list                                │
│ ├─ /credential/:id - Details + Share button                     │
│ └─ /share/:id - QR code display                                 │
│                                                                   │
│ Hooks:                                                            │
│ ├─ useAuth() - Login/logout                                     │
│ ├─ useSession() - Session management                            │
│ └─ useMetaMask() - Wallet connection                            │
│                                                                   │
│ Context:                                                          │
│ └─ AuthContext - User state across app                          │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP/REST
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND API (Express.js)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Auth Routes:                                                      │
│ ├─ POST /auth/register                                          │
│ │  └─ Uses: hashPassword(), sessionManager                      │
│ ├─ POST /auth/login                                             │
│ │  └─ Uses: verifyPassword(), sessionManager                    │
│ ├─ POST /auth/wallet/challenge                                  │
│ │  └─ Uses: walletVerifier.createChallenge()                    │
│ └─ POST /auth/wallet/verify                                     │
│    └─ Uses: walletVerifier.verifySignedChallenge()              │
│                                                                   │
│ Credential Routes:                                                │
│ ├─ POST /credentials/issue                                      │
│ │  └─ Uses: issueCredential(), auditLogger                      │
│ ├─ GET /credentials                                             │
│ │  └─ Query: MongoDB credentials collection                     │
│ ├─ GET /credentials/:id                                         │
│ │  └─ Query: Single credential from MongoDB                     │
│ ├─ POST /credentials/verify                                     │
│ │  └─ Uses: verifyCredential(), 7 checks, auditLogger          │
│ └─ POST /credentials/:id/revoke                                 │
│    └─ Uses: revokeCredential(), blockchain call                │
│                                                                   │
│ Core Services:                                                    │
│ ├─ authService.ts                                               │
│ │  ├─ hashPassword()                                            │
│ │  ├─ verifyPassword()                                          │
│ │  ├─ sessionManager                                            │
│ │  └─ walletVerifier                                            │
│ ├─ issuerService.ts                                             │
│ │  └─ issueCredential()                                         │
│ ├─ verifyService.ts                                             │
│ │  └─ verifyCredential()                                        │
│ ├─ didRegistryClient.ts                                         │
│ │  ├─ registerDID()                                             │
│ │  ├─ resolveDID()                                              │
│ │  └─ revokeCredential()                                        │
│ │                                                               │
│ Utilities:                                                        │
│ ├─ logger.ts - Error tracking                                   │
│ ├─ validation.ts - Input validation                             │
│ ├─ auditLog.ts - Operation logging                              │
│ └─ config.ts - Centralized config                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │ MongoDB Driver / ethers.js
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATA LAYER                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ MongoDB (Data Persistence):                                      │
│ ├─ users collection                                              │
│ ├─ user_wallets collection                                       │
│ ├─ sessions collection                                           │
│ ├─ credentials collection                                        │
│ ├─ credential_usage_log collection                               │
│ └─ credential_revocations collection                             │
│                                                                   │
│ Blockchain (Immutable Record):                                   │
│ ├─ DIDRegistry.sol smart contract                                │
│ ├─ registerDID() events                                          │
│ ├─ Credential revocation status                                  │
│ └─ Public verification capability                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Security Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              HOW YOUR DATA STAYS SECURE                           │
└──────────────────────────────────────────────────────────────────┘

PASSWORD SECURITY:
═══════════════════
Alice types password: "MyS3curePass!"

1. Frontend: Sends to backend via HTTPS only
   └─ Not stored locally, not exposed

2. Backend receives password:
   ├─ hash = hashPassword(password)
   │  └─ Uses PBKDF2 with 100,000 iterations
   │  └─ Unique salt per user
   └─ Save to MongoDB:
      ├─ passwordHash: "pbkdf2$..." (128 chars)
      └─ passwordSalt: "random16bytes" (32 chars)

3. Original password deleted from memory
   └─ Never stored anywhere

4. Login verification:
   ├─ User enters password again
   ├─ Backend: verifyPassword(input, hash, salt)
   │  └─ Hash input with same salt
   │  └─ Compare hashes (constant-time)
   └─ ✅ Match = Login success
      ❌ No match = Login failed


WALLET SECURITY:
════════════════
Alice wants to link wallet 0xAlice123

1. Frontend requests challenge:
   └─ POST /auth/wallet/challenge
      └─ Backend: walletVerifier.createChallenge()
         └─ Returns: challengeId + unique message

2. Backend creates message:
   ├─ Message: "Verify wallet ownership for DID"
   ├─ Includes: Random nonce + timestamp
   ├─ Expires: After 5 minutes
   └─ Stored in memory

3. Frontend shows MetaMask popup:
   ├─ MetaMask shows message to user
   ├─ User reviews message
   └─ User clicks "Sign"
      └─ MetaMask signs using 0xAlice's private key
         (Private key NEVER leaves user's device!)

4. Signature returned to frontend:
   ├─ Signature is cryptographic proof
   ├─ Proof that: "0xAlice has the private key for 0xAlice123"
   ├─ Cannot be forged without the private key
   └─ Sent to backend

5. Backend verifies signature:
   ├─ recoverAddress(message, signature)
   ├─ Get recovered address: 0xAlice123 ✅
   ├─ Compare with claimed address ✅
   └─ Create DID and save

Result: We know for certain that Alice controls 0xAlice123


SESSION SECURITY:
═════════════════
After login, Alice has session token

1. Session created:
   ├─ sessionId: "SES-uuid"
   ├─ userId: linked
   ├─ createdAt: now
   ├─ expiresAt: now + 1 hour
   ├─ lastActivity: now
   └─ isValid: true

2. Frontend stores in:
   ├─ Secure HTTP-only cookie (preferred)
   └─ sessionStorage (minimum)

3. Session validation on each request:
   ├─ Check: Is session ID in database?
   ├─ Check: Has it expired? (expiresAt > now)
   ├─ Check: Was there activity? (lastActivity > 15 min ago)
   └─ If all yes: ✅ Valid, allow request

4. Inactivity protection:
   ├─ No requests for 15 minutes?
   ├─ Session invalidated automatically
   └─ User must login again

5. Logout:
   ├─ DELETE sessionId from database
   ├─ Delete cookie from frontend
   └─ Immediate access denied


CREDENTIAL SECURITY:
════════════════════
University issues credential to Alice

1. Credential creation:
   ├─ Subject: Alice's DID (did:mychain:0xAlice)
   ├─ Claims: Verified degree info
   ├─ Issuer: University's DID
   ├─ Timestamp: Issued now
   ├─ Expiration: 1 year from now
   └─ Status: "ACTIVE" (can be used once)

2. Credential signed:
   ├─ issuerService signs credential
   ├─ Uses university's private key
   ├─ Signature proves: "University says this is true"
   ├─ Signature appended to credential JSON
   └─ Stored on blockchain + MongoDB

3. Credential presented:
   ├─ Alice wants to show to employer
   ├─ System asks: "Sign to prove you own this"
   ├─ Alice signs with her wallet (0xAlice)
   ├─ Signature proves: "I'm the subject of this credential"
   └─ BOTH signatures sent to verifier:
      ├─ University's signature (proof of issuance)
      └─ Alice's signature (proof of ownership)

4. Verification with both signatures:
   ├─ Check 1: University sig valid? ✅
   ├─ Check 2: Alice sig valid? ✅
   ├─ Check 3: Alice sig matches subject? ✅
   ├─ Check 4: Not used before? ✅
   ├─ Check 5: Not expired? ✅
   └─ Result: ✅ VERIFIED (Alice owns this cred)

5. Fraud prevention:
   ├─ Bob tries Alice's credential
   ├─ System asks: "Who are you?"
   ├─ Bob signs with 0xBob
   │  └─ Gets: Bob's signature
   ├─ Backend checks:
   │  ├─ University sig: ✅ (still valid)
   │  ├─ Bob sig: ✅ (from 0xBob)
   │  ├─ Subject: did:mychain:0xAlice
   │  ├─ Signer: 0xBob
   │  └─ Match? ❌ NO!
   └─ Result: ❌ BLOCKED (fraud detected)


AUDIT TRAIL SECURITY:
═════════════════════
Every operation logged:

1. Successful issuance:
   ├─ auditId: AUDIT-uuid
   ├─ operation: "issue"
   ├─ subject: Alice
   ├─ credentialId: cred-1
   ├─ timestamp: Dec 6 10:00 AM
   └─ status: SUCCESS

2. Successful verification:
   ├─ auditId: AUDIT-uuid
   ├─ operation: "verify"
   ├─ presenterId: Alice
   ├─ verifierId: Google
   ├─ credentialId: cred-1
   ├─ timestamp: Dec 6 2:35 PM
   └─ status: SUCCESS

3. Failed verification (fraud):
   ├─ auditId: AUDIT-uuid
   ├─ operation: "verify"
   ├─ presenterId: Bob
   ├─ credentialId: cred-1
   ├─ timestamp: Dec 6 2:40 PM
   ├─ error: "Holder mismatch"
   └─ status: FAILED

Benefits:
├─ Complete history of every credential
├─ Detects suspicious patterns
├─ Enables fraud investigation
├─ Satisfies regulatory audits
└─ Protects all parties
```

---

## Summary Matrix

```
┌────────────────────────────────────────────────────────┐
│              FEATURE COMPLETENESS MATRIX               │
├────────────────────────────────────────────────────────┤
│ Feature                    │ Status  │ Implementation │
├────────────────────────────┼─────────┼────────────────┤
│ Email/Password Auth        │ ✅      │ Ready         │
│ Password Hashing           │ ✅      │ Ready         │
│ Session Management         │ ✅      │ Ready         │
│ MetaMask Linking           │ ✅      │ Ready         │
│ DID Registration           │ ✅      │ Ready         │
│ Credential Issuance        │ ✅      │ Ready         │
│ Credential Verification    │ ✅      │ Ready         │
│ Credential Revocation      │ ✅      │ Ready         │
│ Holder Binding (Signatures)│ ✅      │ Ready         │
│ One-Time Credentials       │ ✅      │ Ready         │
│ Audit Logging              │ ✅      │ Ready         │
│ Error Tracking             │ ✅      │ Ready         │
│ Input Validation           │ ✅      │ Ready         │
│ Content-Type Checks        │ ✅      │ Ready         │
│ Smart Contract Events      │ ✅      │ Ready         │
│ Credential Metadata        │ ✅      │ Ready         │
├────────────────────────────┼─────────┼────────────────┤
│ MongoDB Integration        │ ⬜      │ NEXT: You build│
│ API Endpoints              │ ⬜      │ NEXT: You build│
│ Frontend Components        │ ⬜      │ NEXT: You build│
│ QR Code Generation         │ ⬜      │ NEXT: You build│
│ QR Code Scanner            │ ⬜      │ NEXT: You build│
└────────────────────────────┴─────────┴────────────────┘
```

**Conclusion:** Backend infrastructure is 100% ready. You just need to build the API layer and frontend! 🚀
