# 🚀 Quick Start Guide - Three-Actor DID System

## Overview
Your DID platform now supports three distinct user types:
- **👤 Holders**: Individuals who own and manage credentials
- **🏛️ Issuers**: Organizations that issue credentials (governments, universities)
- **✅ Verifiers**: Services that request and verify credentials (banks, employers)

---

## 🎯 Getting Started

### 1. Start the System

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```
Backend runs on: `http://localhost:4000`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5174`

**Terminal 3 - Blockchain (Optional):**
```powershell
cd contracts
npx hardhat node
```

---

## 👤 Testing as a HOLDER

### Step 1: Register
1. Open `http://localhost:5174`
2. Click "Register" tab
3. Fill in details:
   - Email: `holder@example.com`
   - Password: `Password123!`
   - First Name: `John`
   - Last Name: `Doe`
   - **Role: Select "👤 Holder"**
4. Click "Register"

### Step 2: View Dashboard
- See your credentials count
- View pending verification requests
- Check approved requests

### Step 3: Respond to Requests (when available)
1. Click on a pending request
2. Review requested credential types
3. Select credentials to share
4. Click "Approve & Share" or "Reject"

---

## 🏛️ Testing as an ISSUER

### Step 1: Register
1. Open `http://localhost:5174` (in incognito/private window)
2. Click "Register" tab
3. Fill in details:
   - Email: `issuer@gov.in`
   - Password: `Password123!`
   - First Name: `UIDAI`
   - Last Name: `India`
   - **Role: Select "🏛️ Issuer"**
4. Click "Register"

### Step 2: Complete Issuer Profile
You'll see a registration form:
- **Organization Name**: `Unique Identification Authority of India`
- **Organization Type**: `Government`
- **Country**: `India`
- **Authorized Credential Types**: `AadharCredential, PANCredential`
- Click "Register as Issuer"

### Step 3: Wait for Verification
Your status will be "pending". In production, an admin would approve this.

**For Testing - Manual Database Update:**
```javascript
// Connect to MongoDB and run:
db.issuerregistries.updateOne(
  { organizationName: "Unique Identification Authority of India" },
  { $set: { verificationStatus: "verified" } }
)
```

### Step 4: Issue Credentials
Once verified:
1. Navigate to "Issue" tab
2. Create credentials for holders
3. System validates you're authorized for that credential type

---

## ✅ Testing as a VERIFIER

### Step 1: Register
1. Open `http://localhost:5174` (in another incognito window)
2. Click "Register" tab
3. Fill in details:
   - Email: `verifier@bank.com`
   - Password: `Password123!`
   - First Name: `HDFC`
   - Last Name: `Bank`
   - **Role: Select "✅ Verifier"**
4. Click "Register"

### Step 2: Create Verification Request
1. Click "➕ New Request" in sidebar
2. Fill in the form:
   - **Holder DID**: (optional, leave empty for open request)
   - **Requested Credential Types**: `AadharCredential, PANCredential`
   - **Purpose**: `KYC for opening bank account`
   - **Expires in minutes**: `60`
3. Click "Create Request"

### Step 3: Track Request
- View all requests in "📨 All Requests"
- See status updates (pending → approved/rejected)
- View shared credentials once approved

---

## 🔄 Complete Workflow Test

### Scenario: Bank KYC Process

1. **Create 3 Accounts:**
   - Holder: `citizen@example.com`
   - Issuer: `uidai@gov.in` 
   - Verifier: `hdfc@bank.com`

2. **Issuer Setup:**
   - Register UIDAI as issuer
   - Set authorized types: `AadharCredential, PANCredential`
   - Manually verify in database (simulate admin approval)

3. **Issue Credential:**
   - Issuer logs in
   - Issues Aadhar credential to citizen's DID
   - Citizen receives credential

4. **Request Verification:**
   - HDFC Bank logs in as verifier
   - Creates request for `AadharCredential`
   - Sets purpose: "Account opening KYC"

5. **Holder Response:**
   - Citizen logs in
   - Sees pending request from HDFC
   - Reviews purpose and requested types
   - Selects Aadhar credential
   - Clicks "Approve & Share"

6. **Verification:**
   - HDFC views approved request
   - Sees shared Aadhar credential
   - Verifies credential details
   - Completes KYC process

---

## 🧪 API Testing with cURL/Postman

### Register as Holder
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "holder@test.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Holder",
    "role": "holder"
  }'
```

### Register as Issuer
```bash
curl -X POST http://localhost:4000/api/issuer/register \
  -H "Content-Type: application/json" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -d '{
    "organizationName": "Test Gov",
    "organizationType": "Government",
    "country": "India",
    "authorizedCredentialTypes": ["TestCredential"]
  }'
```

### Create Verification Request
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

### Get Verification Requests (Holder)
```bash
curl http://localhost:4000/api/credentials/verification-requests \
  -H "x-session-id: YOUR_SESSION_ID"
```

### Respond to Request
```bash
curl -X POST http://localhost:4000/api/credentials/respond-verification \
  -H "Content-Type: application/json" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -d '{
    "requestId": "REQUEST_ID",
    "action": "approve",
    "selectedCredentials": [
      {"credentialId": "CRED_ID_1"}
    ]
  }'
```

---

## 🎨 UI Navigation Guide

### Holder UI:
```
Header: [DID Platform] [holder badge] [John Doe] [Connect Wallet] [Logout]

Sidebar:
├── 📊 Dashboard
└── 📄 My Credentials

Dashboard View:
├── Stats Cards (Credentials, Pending Requests, Approved)
├── Verification Requests List
└── Request Review Modal
```

### Issuer UI:
```
Header: [DID Platform] [issuer badge] [UIDAI India] [Logout]

Sidebar:
├── 📊 Dashboard
└── ➕ Issue Credential

Dashboard View:
├── Organization Profile Card
│   ├── Name, Type, Country
│   ├── Verification Status Badge
│   └── Authorized Types
└── Issue Credentials Section (if verified)
```

### Verifier UI:
```
Header: [DID Platform] [verifier badge] [HDFC Bank] [Logout]

Sidebar:
├── 📊 Dashboard
├── ➕ New Request
└── 📨 All Requests

Dashboard View:
├── Stats Cards (Total, Pending, Approved)
└── Recent Requests List
```

---

## 🔧 Troubleshooting

### Issue: Issuer can't issue credentials
**Solution:** Check verification status
```javascript
// MongoDB query:
db.issuerregistries.find({ organizationName: "YOUR_ORG" })

// Update if needed:
db.issuerregistries.updateOne(
  { organizationName: "YOUR_ORG" },
  { $set: { verificationStatus: "verified" } }
)
```

### Issue: Request not showing up for holder
**Check:**
1. Request hasn't expired
2. Holder has linked wallet (if holderDid was specified)
3. Request status is 'pending'

### Issue: "Not authorized to issue" error
**Solution:**
- Check issuer's `authorizedCredentialTypes` includes the credential type
- Ensure `type` parameter matches authorized types exactly

### Issue: Session expired
**Solution:**
- Re-login
- Sessions expire after inactivity
- Check `expiresAt` timestamp

---

## 📊 Database Inspection

### View All Users by Role:
```javascript
db.users.find({ role: "holder" })
db.users.find({ role: "issuer" })
db.users.find({ role: "verifier" })
```

### View Issuer Registrations:
```javascript
db.issuerregistries.find()
```

### View Verification Requests:
```javascript
db.verificationrequests.find()
db.verificationrequests.find({ status: "pending" })
```

### View Credentials:
```javascript
db.credentials.find()
db.credentials.find({ status: "ACTIVE" })
```

---

## 🎯 Demo Script

### 5-Minute Demo:

**Minute 1-2: Show Three Roles**
- Open 3 browser windows
- Register one account per role
- Show different dashboards side-by-side

**Minute 3: Issuer Flow**
- Show issuer registration
- Display organization profile
- Explain verification status

**Minute 4: Verification Request**
- Verifier creates request
- Show request form
- Explain purpose field

**Minute 5: Holder Response**
- Holder sees request
- Reviews details
- Approves and shares credential
- Verifier sees shared credential

---

## 📝 Key Features to Highlight

✨ **Role-Based Access Control**
- Each role has specific permissions
- Issuers can only issue if verified
- Verifiers can only request verification

✨ **Issuer Authorization**
- Issuers limited to specific credential types
- Authorization checked on every issuance
- Registry of verified issuers

✨ **Verification Workflow**
- Request-response pattern
- Time-limited requests
- Selective credential sharing

✨ **Security**
- Session-based authentication
- Role validation middleware
- Credential ownership checks

---

## 🚀 Production Considerations

Before deploying:
1. ✅ Implement admin approval for issuers
2. ✅ Add email notifications
3. ✅ Implement proper cryptographic verification
4. ✅ Add rate limiting
5. ✅ Enable HTTPS
6. ✅ Add request signing
7. ✅ Implement audit logging
8. ✅ Add data retention policies

---

**Ready to test!** 🎉

Questions? Check `THREE_ACTOR_IMPLEMENTATION.md` for technical details.
