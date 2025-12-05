# 🎯 DID Platform - Demo Guide for Tomorrow

## **Before Starting (Setup Phase - 5 minutes)**

### **Step 1: Open 4 Terminal Windows**
Arrange them side by side:
- Terminal 1: Blockchain (Hardhat)
- Terminal 2: Contract Deployment
- Terminal 3: Backend API
- Terminal 4: Frontend

### **Step 2: Start Blockchain Node**
**Terminal 1:**
```powershell
cd d:\College\TY\SEM 5\EDI\Project\did-platform\contracts
npx hardhat node
```
Wait for: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545`

### **Step 3: Deploy Smart Contract**
**Terminal 2:**
```powershell
cd d:\College\TY\SEM 5\EDI\Project\did-platform\contracts
npx hardhat run scripts/test-did.js --network localhost
```
Wait for successful output showing:
- ✅ DIDRegistry deployed at: `0x...`
- ✅ Contract address saved to backend
- ✅ Contract address saved to frontend

### **Step 4: Start Backend API**
**Terminal 3:**
```powershell
cd d:\College\TY\SEM 5\EDI\Project\did-platform\backend
npm run dev
```
Wait for: `Server listening on port 4000`

### **Step 5: Start Frontend**
**Terminal 4:**
```powershell
cd d:\College\TY\SEM 5\EDI\Project\did-platform\frontend
npm run dev
```
Wait for: `Local: http://localhost:5173`

---

## **Demo Phase 1: User Identity (10 minutes)**

### **What You're Showing**
"Users create a self-sovereign identity on the blockchain"

### **Step 1: Open MetaMask**
- Click MetaMask extension in Chrome
- Network dropdown → Select "Hardhat Localhost" (chainId 31337)
  - If not configured yet:
    - Click "Add network"
    - RPC URL: `http://127.0.0.1:8545`
    - Chain ID: `31337`
    - Network Name: `Hardhat Localhost`

### **Step 2: Open Frontend**
- Open browser: `http://localhost:5173`
- You should see the DID Platform interface

### **Step 3: Connect Wallet**
**In the frontend:**
- Click "Connect Wallet" button
- MetaMask popup appears → Click "Connect"
- **Show to audience:** 
  - Your wallet address appears: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Your DID is generated: `did:mychain:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Say:** 
> "Notice how your DID is derived from your wallet address. This creates a permanent, globally unique identity that you control through your private key."

### **Step 4: Register DID on Blockchain**
**In the frontend:**
- Enter DID Document URI: `https://example.com/my-did-document`
- Click "Register DID on-chain"
- Wait for transaction confirmation
- **Show to audience:**
  - Transaction is submitted to blockchain
  - Status updates: "DID registered successfully!"
  - Check the browser console (F12) to see resolved DID data

**Say:**
> "Your identity is now permanently recorded on the blockchain. No one can forge or delete it. Your DID Document URI points to where your identity information is stored."

---

## **Demo Phase 2: Credential Issuance (8 minutes)**

### **What You're Showing**
"The system issues a signed credential to prove a claim about you"

### **Step 1: Request a Credential**
**In the frontend:**
- Click "Request Credential from Issuer"
- Wait for response

**Show to audience in console (F12):**
- Open DevTools → Console tab
- Look for the issued credential JSON
- Show structure:
  ```json
  {
    "issuer": "did:mychain:issuer-demo-1",
    "subject": "did:mychain:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "credentialSubject": {
      "name": "Demo User",
      "role": "Student",
      "university": "XYZ Institute"
    },
    "proof": {...cryptographic_signature...}
  }
  ```

**Say:**
> "This credential is digitally signed by the issuer (the backend system). The issuer is `did:mychain:issuer-demo-1`. This signature proves the issuer created and endorses this credential. Only they have the private key to create this signature."

### **Step 2: See Credential in Wallet**
**In the frontend:**
- Scroll down to "Your Credentials" section
- You should see the credential listed
- Click "View JSON" or "Copy" to show the full credential

**Say:**
> "This credential is now stored in your digital wallet. You can share it with anyone who needs to verify that you're a Student at XYZ Institute. The issuer didn't need to store it - you control it."

---

## **Demo Phase 3: Credential Verification (8 minutes)**

### **What You're Showing**
"Verify that a credential is legitimate and not revoked"

### **Step 1: Copy Credential**
**In the frontend:**
- Click "Copy" on the credential in your wallet
- This copies the full JSON to clipboard

**Say:**
> "Now I'm going to pretend I'm a third party (like a university admissions office) who received this credential."

### **Step 2: Paste and Verify**
**In the frontend:**
- Paste the credential JSON in "Verify Credential" section
- Click "Verify Credential"
- Wait for result

**Show to audience:**
- Result: ✅ **Credential is VALID**
- Explains what the system verified:
  1. ✅ Signature is valid (matches issuer's public key)
  2. ✅ Issuer DID exists on blockchain
  3. ✅ Credential is not revoked
  4. ✅ All fields match expected format

**Say:**
> "The verifier checked:
> 1. The signature is authentic (signed by the issuer's private key)
> 2. The issuer is registered on the blockchain
> 3. The credential hasn't been revoked
> 
> If any check fails, the credential would be marked INVALID. This gives verifiers cryptographic proof of authenticity."

---

## **Demo Phase 4: Revocation (7 minutes)**

### **What You're Showing**
"Issuers can revoke credentials they issued"

### **Step 1: Revoke the Credential**
**In the frontend:**
- Find the "Revoke Credential" button/section
- Enter the credential ID or click revoke on the credential
- Click "Revoke"
- Wait for confirmation

**Show to audience:**
- Status: ✅ Credential revoked successfully
- Check Terminal 3 (Backend) to see the blockchain transaction being sent

**Say:**
> "The issuer just revoked this credential. This revocation is recorded on the blockchain and is permanent. Even though the credential itself hasn't changed, anyone who tries to verify it will now see it as revoked."

### **Step 2: Try to Verify Revoked Credential**
**In the frontend:**
- Verify the same credential again (still in the Verify section)
- Click "Verify Credential"
- Wait for result

**Show to audience:**
- Result: ❌ **Credential is INVALID**
- Reason: "Credential is revoked"

**Say:**
> "See how the verification now fails? This demonstrates the power of blockchain-based revocation. There's no central database to update - the revocation is permanently recorded on an immutable ledger that everyone can check."

---

## **Demo Phase 5: Technical Deep Dive (Optional - 10 minutes)**

### **If Audience Asks for More Technical Details:**

### **Show the Smart Contract**
**Terminal 2:**
```powershell
cat d:\College\TY\SEM 5\EDI\Project\did-platform\contracts\contracts\DIDRegistry.sol
```

**Explain:**
- `registerDID()` - Stores identity document URI
- `resolveDID()` - Retrieves identity information
- `setCredentialStatus()` - Marks credential as revoked
- `isCredentialRevoked()` - Checks revocation status

### **Show Backend API**
**Terminal 3:**
- Make a request to verify:
```powershell
curl -X POST http://localhost:4000/verify -H "Content-Type: application/json" -d @credential.json
```

**Explain:**
- Backend validates JWT signature
- Checks blockchain for revocation status
- Returns valid/invalid result

### **Show Blockchain Interaction**
**Terminal 1 (Hardhat node):**
- Show logs of smart contract calls
- Each transaction shows function calls and state changes

---

## **Demo Phase 6: Real-World Scenario (10 minutes)**

### **Act Out a Practical Example**

#### **Scenario: University Credential**

**Script:**
1. **"I'm a student"** (Connect wallet, register DID)
   - "My DID proves my identity on the blockchain"

2. **"My university issues a credential"** (Request credential)
   - "This proves I graduated with a degree in Computer Science"
   - "It's cryptographically signed, so it can't be forged"

3. **"I apply to a job"** (Share credential)
   - "I give my credential to the employer"
   - "They verify it without contacting the university"

4. **"Verification happens instantly"** (Verify credential)
   - "The employer checks: signature valid ✅, issuer exists ✅, not revoked ✅"
   - "Decision made in seconds"

5. **"If I cheated, the university revokes it"** (Revoke credential)
   - "The university revokes the credential on the blockchain"
   - "Any future verification will fail"
   - "The revocation is permanent and transparent"

---

## **Talking Points During Demo**

### **Point 1: Self-Sovereign Identity**
> "Users own their identity - it's derived from their wallet. No central authority controls it."

### **Point 2: Cryptographic Security**
> "Every credential is digitally signed. Signatures can't be forged without the issuer's private key."

### **Point 3: Immutability**
> "Once registered on the blockchain, identity records can't be changed or deleted."

### **Point 4: Revocation**
> "Issuers can revoke credentials, and the revocation is permanently recorded on the blockchain."

### **Point 5: User Privacy**
> "Users only share what they want. They don't need to share their entire identity document."

### **Point 6: No Intermediary**
> "Verifiers don't need to call the issuer to check credentials - they can verify cryptographically."

---

## **Potential Questions & Answers**

### **Q: How is this better than traditional credentials?**
A: 
- Instant verification (no phone calls to issuer)
- Tamper-proof (cryptographic signatures)
- User controls who has their data
- Issuers can revoke but can't forge
- Works globally with no gatekeepers

### **Q: What if the private key is stolen?**
A: 
- For users: They could revoke their DID and create a new one
- For issuers: They should use hardware wallets or key management services
- This is why production systems use enterprise key management

### **Q: Is this only for education?**
A: 
- No! Use cases: employment, licenses, professional certifications, supply chain, voting, etc.

### **Q: What happens if the issuer loses their key?**
A:
- They can't issue new credentials
- They can't revoke old ones
- This is why key backup and recovery is important (we have crypto/backup.ts)

### **Q: Can credentials be transferred?**
A:
- Yes, but they're only valid when the credential is owned by the subject
- Transferring credentials without consent is meaningless for verification

---

## **Quick Reference - Important URLs**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Blockchain Node | http://127.0.0.1:8545 |
| Contract Address | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |
| MetaMask RPC | http://127.0.0.1:8545 |

---

## **Demo Timeline Summary**

| Phase | Duration | What You Do |
|-------|----------|------------|
| Setup | 5 min | Start all services |
| Identity | 10 min | Register DID on blockchain |
| Issuance | 8 min | Issue credential |
| Verification | 8 min | Verify valid credential |
| Revocation | 7 min | Revoke & verify fails |
| Deep Dive | 10 min | (Optional) Show code |
| Scenario | 10 min | Real-world walkthrough |
| Q&A | - | Answer questions |
| **Total** | **~58 min** | |

---

## **Pro Tips for Demo Success**

✅ **Test everything before the demo**
- Run all 4 terminals in advance
- Verify MetaMask is set to Hardhat Localhost
- Have a credential pre-verified

✅ **Have backup scenarios**
- If something breaks, have a second wallet address ready
- Keep screenshots of expected outputs

✅ **Slow down and explain**
- Don't rush through clicks
- Give audience time to understand each step
- Let people ask questions

✅ **Use visual aids**
- Have the architecture diagram ready to explain
- Point to specific parts of credentials in JSON
- Use the console to show actual data

✅ **Emphasize key innovations**
- Immutability (blockchain)
- Cryptographic security (signatures)
- User control (self-sovereign)
- Revocation mechanism (on-chain)

---

## **If You Have Extra Time - Live Coding**

### **Show How to Add a New Issuer**

Edit `.env`:
```dotenv
ISSUER_DID=did:mychain:issuer-special-university
```

Restart backend and issue a new credential with the new issuer.

**Say:** "This is how easy it is to add new issuers to the system."

---

**Good luck with your demo tomorrow! 🚀**
