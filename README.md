# 🔐 Decentralized Identity (DID) Platform

A complete **three-actor** decentralized identity management system built with blockchain technology, supporting Holders, Issuers, and Verifiers.

---

## 🎯 Overview

This platform implements a W3C-compliant DID system with three distinct user roles:

- **👤 Holders**: Individuals who own and manage their digital credentials
- **🏛️ Issuers**: Organizations (governments, universities) that issue credentials  
- **✅ Verifiers**: Services (banks, employers) that request and verify credentials

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│           Frontend (React + TypeScript)              │
├──────────────┬──────────────┬──────────────────────┤
│   Holder     │   Issuer     │    Verifier          │
│  Dashboard   │  Dashboard   │   Dashboard          │
└──────┬───────┴──────┬───────┴──────┬───────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│         Backend API (Node.js + Express)             │
├──────────────┬──────────────┬──────────────────────┤
│ /api/auth    │ /api/issuer  │ /api/verifier       │
│ /api/creds   │              │                      │
└──────┬───────┴──────┬───────┴──────┬───────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│            MongoDB Database                         │
├──────────────┬──────────────┬──────────────────────┤
│    Users     │   Issuer     │  Verification        │
│ Credentials  │   Registry   │    Requests          │
└──────────────┴──────────────┴──────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│    Blockchain (Ethereum + Hardhat)                  │
│         DID Registry Smart Contract                 │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- MetaMask browser extension

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Mohit706132/did-platform.git
cd did-platform
```

2. **Setup Backend:**
```bash
cd backend
npm install
```

Create `.env` file:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/did-platform
# or for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/did-platform

# Server
BACKEND_PORT=4000
NODE_ENV=development

# JWT/Crypto
ISSUER_PRIVATE_KEY=your-private-key-here
JWT_SECRET=your-jwt-secret-here

# Blockchain
RPC_URL=http://127.0.0.1:8545
DID_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

3. **Setup Frontend:**
```bash
cd ../frontend
npm install
```

Create `.env`:
```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RPC_URL=http://127.0.0.1:8545
```

4. **Setup Blockchain:**
```bash
cd ../contracts
npm install
```

---

## 🎮 Running the System

### Start All Services:

**Terminal 1 - Blockchain:**
```bash
cd contracts
npx hardhat node
```
Runs on: `http://localhost:8545`

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```
Runs on: `http://localhost:4000`

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```
Runs on: `http://localhost:5174`

**Open in browser:** http://localhost:5174

---

## 👥 User Roles & Workflows

### 👤 Holder (Individual User)

**Capabilities:**
- Receive credentials from issuers
- View and manage personal credentials
- Receive verification requests from verifiers
- Selectively share credentials with privacy control
- Approve or reject verification requests

**Workflow:**
1. Register with role "Holder"
2. Connect MetaMask wallet (optional)
3. Receive credentials from verified issuers
4. View incoming verification requests
5. Review request purpose and required credentials
6. Select specific credentials to share
7. Approve or reject the request

**Dashboard Features:**
- Total credentials count
- Pending verification requests
- Approved requests history
- My Credentials library

---

### 🏛️ Issuer (Organization)

**Capabilities:**
- Register as an issuing organization
- Submit verification documents
- Issue credentials once verified
- Manage authorized credential types
- Track issued credentials

**Workflow:**
1. Register with role "Issuer"
2. Complete organization profile:
   - Organization name
   - Organization type (Government, University, etc.)
   - Country
   - Authorized credential types
3. Submit for verification (status: pending)
4. Once approved by admin (status: verified)
5. Issue credentials to holders

**Dashboard Features:**
- Organization profile with verification status
- Authorized credential types badges
- Issue credential interface
- Issued credentials tracking

**Example Organizations:**
- UIDAI (Aadhar Card issuer)
- Indian Government (PAN Card, Driving License)
- Universities (Education certificates)

---

### ✅ Verifier (Service Provider)

**Capabilities:**
- Create verification requests
- Specify required credential types
- Track request status
- View shared credentials
- Verify credential authenticity

**Workflow:**
1. Register with role "Verifier"
2. Create verification request:
   - Specify credential types needed
   - State purpose of verification
   - Set expiration time
   - Optionally target specific holder
3. System sends request to holder
4. Wait for holder response
5. View shared credentials when approved
6. Verify credential details

**Dashboard Features:**
- Total requests statistics
- Pending vs approved requests
- Create new request form
- Request tracking with status updates
- Shared credentials viewer

**Example Use Cases:**
- Banks: KYC verification (Aadhar, PAN)
- Employers: Background verification (Education, Employment)
- Government: Identity verification (Voter ID, Driving License)

---

## 🔐 Security Features

### Authentication & Authorization
- **Session-based authentication** with JWT tokens
- **Role-based access control (RBAC)** enforced at API level
- **Password hashing** using bcrypt with salt
- **Session expiration** and activity tracking
- **Wallet ownership verification** via challenge-response

### Issuer Verification
- Issuers must register and await admin approval
- **Verification status**: pending → verified → can issue
- **Credential type authorization**: Issuers limited to specific types
- System validates issuer authorization on every credential issuance

### Request Validation
- **Time-bound requests** with automatic expiration
- **Status validation**: Can't respond to expired/closed requests
- **Ownership checks**: Holders can only share their own credentials
- **Purpose tracking**: All requests logged with stated purpose

### Data Privacy
- **Selective disclosure**: Holders choose which fields to share
- **Encrypted storage**: Sensitive data encrypted at rest
- **Audit logging**: All credential operations logged
- **Revocation support**: Credentials can be revoked by issuer

---

## 📡 API Reference

### Authentication Endpoints

**POST `/api/auth/register`**
Register a new user with role selection.
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "holder" // or "issuer" or "verifier"
}
```

**POST `/api/auth/login`**
Login and receive session token.
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
Returns: `sessionId`, `role`, user details

**POST `/api/auth/logout`**
Invalidate current session.

---

### Holder Endpoints

**GET `/api/credentials`**
Get all credentials for current holder.
```
Headers: x-session-id: {sessionId}
```

**GET `/api/credentials/verification-requests`**
Get all verification requests sent to this holder.

**POST `/api/credentials/respond-verification`**
Respond to a verification request.
```json
{
  "requestId": "req-uuid",
  "action": "approve", // or "reject"
  "selectedCredentials": [
    { "credentialId": "cred-123" }
  ]
}
```

---

### Issuer Endpoints

**POST `/api/issuer/register`**
Register as an issuing organization.
```json
{
  "organizationName": "UIDAI",
  "organizationType": "Government",
  "country": "India",
  "authorizedCredentialTypes": ["AadharCredential", "PANCredential"]
}
```

**GET `/api/issuer/profile`**
Get issuer profile and verification status.

**PUT `/api/issuer/profile`**
Update issuer profile details.

**GET `/api/issuer/verify/:issuerDid`** (Public)
Verify if a DID belongs to an authorized issuer.

**GET `/api/issuer/list`** (Public)
List all verified issuers (filterable by country/type).

**POST `/api/credentials/issue`**
Issue a credential to a holder (requires verified issuer status).
```json
{
  "subjectDid": "did:mychain:0x...",
  "type": ["VerifiableCredential", "AadharCredential"],
  "claims": {
    "aadharNumber": "1234-5678-9012",
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-01"
  }
}
```

---

### Verifier Endpoints

**POST `/api/verifier/request`**
Create a new verification request.
```json
{
  "holderDid": "did:mychain:0x..." // optional
  "requestedCredentialTypes": ["AadharCredential", "PANCredential"],
  "requestedFields": {
    "AadharCredential": ["fullName", "dateOfBirth"]
  },
  "purpose": "KYC verification for account opening",
  "expiresInMinutes": 60
}
```

**GET `/api/verifier/requests`**
Get all verification requests created by this verifier.

**GET `/api/verifier/request/:requestId`**
Get details of a specific request including shared credentials.

**POST `/api/verifier/verify`**
Verify authenticity of shared credentials.
```json
{
  "credentials": [/* array of credential objects */]
}
```

---

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  passwordSalt: String,
  firstName: String,
  lastName: String,
  role: String, // "holder" | "issuer" | "verifier"
  createdAt: Date,
  lastLogin: Date
}
```

### IssuerRegistry Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  issuerDid: String (unique),
  organizationName: String,
  organizationType: String,
  country: String,
  authorizedCredentialTypes: [String],
  verificationStatus: String, // "pending" | "verified" | "rejected"
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  metadata: Object
}
```

### VerificationRequest Collection
```javascript
{
  _id: ObjectId,
  requestId: String (unique),
  verifierId: ObjectId (ref: User),
  verifierDid: String,
  holderId: ObjectId (ref: User),
  holderDid: String,
  requestedCredentialTypes: [String],
  requestedFields: Object,
  purpose: String,
  status: String, // "pending" | "approved" | "rejected" | "expired"
  sharedCredentials: [Object],
  responseAt: Date,
  expiresAt: Date,
  createdAt: Date
}
```

### Credentials Collection
```javascript
{
  _id: ObjectId,
  credentialId: String (unique),
  issuerId: ObjectId (ref: User),
  subjectId: ObjectId (ref: User),
  subjectDid: String,
  credentialData: Object, // Full VC object
  status: String, // "ACTIVE" | "REVOKED"
  issuedAt: Date,
  expiresAt: Date
}
```

---

## 🧪 Testing Guide

### Test Scenario 1: Complete KYC Flow

**Step 1: Create Test Accounts**

Open 3 different browser windows (or use incognito):

1. **Holder Account**
   - URL: http://localhost:5174
   - Register as Holder
   - Email: `john.doe@example.com`
   - Password: `Password123!`

2. **Issuer Account**
   - URL: http://localhost:5174 (new window)
   - Register as Issuer
   - Email: `uidai@gov.in`
   - Organization: "UIDAI"
   - Types: `AadharCredential, PANCredential`

3. **Verifier Account**
   - URL: http://localhost:5174 (new window)
   - Register as Verifier
   - Email: `hdfc@bank.com`

**Step 2: Verify Issuer (Manual)**

Connect to MongoDB and run:
```javascript
db.issuerregistries.updateOne(
  { organizationName: "UIDAI" },
  { $set: { verificationStatus: "verified" } }
)
```

**Step 3: Issue Credential**

As UIDAI (Issuer):
1. Navigate to "Issue Credential"
2. Enter holder's DID
3. Select credential type: Aadhar
4. Fill in details
5. Submit

**Step 4: Create Verification Request**

As HDFC Bank (Verifier):
1. Click "New Request"
2. Requested types: `AadharCredential`
3. Purpose: "KYC for account opening"
4. Expires: 60 minutes
5. Submit

**Step 5: Holder Responds**

As John Doe (Holder):
1. View "Verification Requests"
2. See request from HDFC Bank
3. Review purpose and requested types
4. Select Aadhar credential
5. Click "Approve & Share"

**Step 6: Verifier Views Result**

As HDFC Bank (Verifier):
1. View "All Requests"
2. See status changed to "approved"
3. View shared Aadhar credential
4. Verify details

---

### Test Scenario 2: Multiple Credentials

1. Issuer issues both Aadhar and PAN to holder
2. Verifier requests both credential types
3. Holder selectively shares only Aadhar
4. Verifier sees partial data

---

### Test with API (cURL)

**Register Holder:**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "holder"
  }'
```

**Create Verification Request:**
```bash
curl -X POST http://localhost:4000/api/verifier/request \
  -H "Content-Type: application/json" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -d '{
    "requestedCredentialTypes": ["AadharCredential"],
    "purpose": "Test KYC",
    "expiresInMinutes": 60
  }'
```

---

## 🛠️ Development

### Project Structure

```
did-platform/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Main server
│   │   ├── models.ts             # MongoDB schemas
│   │   ├── config.ts             # Configuration
│   │   ├── database.ts           # DB connection
│   │   ├── authService.ts        # Authentication
│   │   ├── issuerService.ts      # Credential issuance
│   │   ├── verifyService.ts      # Credential verification
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth endpoints
│   │   │   ├── credentials.ts    # Credential endpoints
│   │   │   ├── issuer.ts         # Issuer endpoints
│   │   │   └── verifier.ts       # Verifier endpoints
│   │   └── utils/
│   │       ├── logger.ts         # Logging utility
│   │       ├── validation.ts     # Input validation
│   │       └── auditLog.ts       # Audit logging
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── App-ThreeActor.tsx    # Main app component
│   │   ├── App.css               # Styles
│   │   └── blockchain/
│   │       ├── config.ts         # Blockchain config
│   │       ├── didRegistry.ts    # Smart contract interface
│   │       └── networks.ts       # Network definitions
│   └── package.json
│
├── contracts/
│   ├── contracts/
│   │   └── DIDRegistry.sol       # Smart contract
│   ├── scripts/
│   │   └── deploy-did-registry.js
│   └── hardhat.config.js
│
└── shared/
    └── src/
        ├── did.ts                # DID types
        └── vc.ts                 # VC types
```

### Tech Stack

**Backend:**
- Node.js 18+
- Express.js
- TypeScript
- MongoDB + Mongoose
- JWT for sessions
- bcrypt for password hashing

**Frontend:**
- React 18
- TypeScript
- Vite
- ethers.js for blockchain
- Modern CSS with animations

**Blockchain:**
- Hardhat
- Solidity
- Ethereum local network

---

## 🔧 Configuration

### Environment Variables

**Backend (`.env`):**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/did-platform

# Server
BACKEND_PORT=4000
NODE_ENV=development

# Security
ISSUER_PRIVATE_KEY=your-key
JWT_SECRET=your-secret

# Blockchain
RPC_URL=http://127.0.0.1:8545
DID_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Frontend (`.env`):**
```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RPC_URL=http://127.0.0.1:8545
```

---

## 🐛 Troubleshooting

### Issue: "Issuer not verified" error
**Solution:** Manually update issuer status in MongoDB:
```javascript
db.issuerregistries.updateOne(
  { organizationName: "YOUR_ORG" },
  { $set: { verificationStatus: "verified" } }
)
```

### Issue: "Not authorized to issue" error
**Solution:** Check that:
1. Issuer is verified
2. Credential type is in `authorizedCredentialTypes` array
3. Type parameter matches exactly (case-sensitive)

### Issue: Request not visible to holder
**Check:**
1. Request hasn't expired
2. Request status is "pending"
3. Holder has correct wallet/DID linked

### Issue: Frontend shows old UI
**Solution:** Clear browser cache or:
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### Issue: MongoDB connection failed
**Solution:**
1. Ensure MongoDB is running: `mongod`
2. Check connection string in `.env`
3. For Atlas, check IP whitelist

---

## 📊 Monitoring & Logs

### Backend Logs
All operations logged with error IDs for tracking:
```
[INFO] User registered successfully
[ERROR] errorId: abc123 - Database connection failed
```

### Audit Logs
Credential operations tracked in `CredentialUsageLog`:
- Who issued
- Who presented
- Who verified
- Result (success/failure)
- Timestamp

### Health Check
```bash
curl http://localhost:4000/health
```
Returns: `{"status": "ok", "timestamp": "..."}`

---

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Use MongoDB Atlas for database
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Add rate limiting
- [ ] Enable audit logging
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure backups
- [ ] Add email notifications
- [ ] Implement admin dashboard
- [ ] Add proper cryptographic verification
- [ ] Enable on-chain verification

### Docker Deployment (Coming Soon)

```bash
docker-compose up
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Authors

- Mohit Patil - [GitHub](https://github.com/Mohit706132)

---

## 🙏 Acknowledgments

- W3C DID specification
- Verifiable Credentials Data Model
- Ethereum blockchain technology
- MongoDB for database
- React community

---

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/Mohit706132/did-platform/issues
- Email: your-email@example.com

---

**Built with ❤️ using Blockchain Technology**

**Version:** 2.0.0 (Three-Actor Model)  
**Last Updated:** December 6, 2025
