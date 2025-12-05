// src/App.tsx
import React, { useEffect, useState } from "react";
import "./App.css";
import {
  getCurrentAddress,
  registerDidOnChain,
  resolveDid
} from "./blockchain/didRegistry";
import { DID_METHOD_PREFIX } from "./blockchain/config";
import type { VerifiableCredential } from "./types/vc";
import { encryptBackup, decryptBackup } from "./crypto/backup";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

function App() {
  const [ethAddress, setEthAddress] = useState<string>("");
  const [did, setDid] = useState<string>("");
  const [didDocUriInput, setDidDocUriInput] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyInput, setVerifyInput] = useState<string>("");
  const [verifyResult, setVerifyResult] = useState<string>("");
  const [backupPassword, setBackupPassword] = useState<string>("");
  const [backupData, setBackupData] = useState<string>(""); // encrypted blob
  const [restorePassword, setRestorePassword] = useState<string>("");
  const [backupMessage, setBackupMessage] = useState<string>("");

    const handleCreateBackup = async () => {
    try {
      if (!backupPassword) {
        setBackupMessage("Please enter a password for backup.");
        return;
      }

      const snapshot = {
        did,
        ethAddress,
        credentials
      };

      const encrypted = await encryptBackup(backupPassword, snapshot);
      setBackupData(encrypted);
      setBackupMessage("Backup created. Copy and store this safely.");
    } catch (err: any) {
      console.error(err);
      setBackupMessage(`Error creating backup: ${err.message ?? String(err)}`);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      if (!restorePassword) {
        setBackupMessage("Please enter the password used for backup.");
        return;
      }
      if (!backupData.trim()) {
        setBackupMessage("No backup data found. Paste or load an encrypted backup first.");
        return;
      }

      const restored = await decryptBackup(restorePassword, backupData);

      if (restored.ethAddress) setEthAddress(restored.ethAddress);
      if (restored.did) setDid(restored.did);
      if (restored.credentials) setCredentials(restored.credentials);

      setBackupMessage("Backup restored successfully.");
    } catch (err: any) {
      console.error(err);
      setBackupMessage(`Error restoring backup: ${err.message ?? String(err)}`);
    }
  };



    const handleVerifyCredential = async () => {
    try {
      if (!verifyInput.trim()) {
        setVerifyResult("Please paste a credential JSON first.");
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(verifyInput);
      } catch {
        setVerifyResult("Invalid JSON. Please check the pasted credential.");
        return;
      }

      setLoading(true);
      setStatus("Verifying credential...");

      const response = await fetch(`${BACKEND_URL}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed)
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Verifier error: ${response.status} ${txt}`);
      }

      const result = await response.json() as { valid: boolean; reason?: string };

      if (result.valid) {
        setVerifyResult("✅ Credential is VALID.");
      } else {
        setVerifyResult(`❌ Credential is INVALID. Reason: ${result.reason ?? "Unknown"}`);
      }

      setStatus("Verification completed.");
    } catch (err: any) {
      console.error(err);
      setVerifyResult(`❌ Error during verification: ${err.message ?? String(err)}`);
      setStatus("Verification failed.");
    } finally {
      setLoading(false);
    }
  };


  // Load credentials from localStorage on start
  useEffect(() => {
    const stored = localStorage.getItem("walletCredentials");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as VerifiableCredential[];
        setCredentials(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("walletCredentials", JSON.stringify(credentials));
  }, [credentials]);

  const connectWallet = async () => {
    try {
      setStatus("Connecting wallet...");
      const addr = await getCurrentAddress();
      setEthAddress(addr);
      const myDid = `${DID_METHOD_PREFIX}${addr}`;
      setDid(myDid);
      setStatus(`Connected as ${addr}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error connecting wallet: ${err.message ?? String(err)}`);
    }
  };

  const handleRegisterDid = async () => {
    if (!ethAddress) {
      setStatus("Connect wallet first.");
      return;
    }
    if (!didDocUriInput) {
      setStatus("Please enter a DID Document URI (can be any string for now).");
      return;
    }

    try {
      setLoading(true);
      setStatus("Registering DID on-chain...");
      await registerDidOnChain(didDocUriInput);
      setStatus("DID registered successfully!");

      const res = await resolveDid(ethAddress);
      console.log("Resolved DID record:", res);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error registering DID: ${err.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const requestCredential = async () => {
    if (!did) {
      setStatus("Connect wallet first to get your DID.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Requesting credential from issuer...");

      const response = await fetch(`${BACKEND_URL}/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subjectDid: did,
          claims: {
            name: "Demo User",
            role: "Student",
            university: "XYZ Institute"
          }
        })
      });

      if (!response.ok) {
        const t = await response.text();
        throw new Error(`Issuer error: ${response.status} ${t}`);
      }

      const vc = (await response.json()) as VerifiableCredential;
      setCredentials((prev) => [...prev, vc]);
      setStatus("Credential received and stored in wallet.");
    } catch (err: any) {
      console.error(err);
      setStatus(`Error requesting credential: ${err.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearCredentials = () => {
    setCredentials([]);
    localStorage.removeItem("walletCredentials");
    setStatus("Cleared stored credentials.");
  };

  return (
    <div className="app-root">
      <h1>My DID Wallet</h1>

      <section className="card">
        <h2>1. Connect Ethereum Wallet</h2>
        <button onClick={connectWallet}>Connect MetaMask</button>
        {ethAddress && (
          <>
            <p><strong>Address:</strong> {ethAddress}</p>
            <p><strong>DID:</strong> {did}</p>
          </>
        )}
      </section>

      <section className="card">
        <h2>2. Register DID on Blockchain</h2>
        <p>
          Enter a DID Document URI (for now, you can just put any URL or short JSON
          describing your public keys).
        </p>
        <input
          type="text"
          value={didDocUriInput}
          onChange={(e) => setDidDocUriInput(e.target.value)}
          placeholder="https://example.com/did/your-did.json"
          style={{ width: "100%" }}
        />
        <button onClick={handleRegisterDid} disabled={loading}>
          {loading ? "Registering..." : "Register DID"}
        </button>
      </section>

      <section className="card">
        <h2>3. Request a Verifiable Credential</h2>
        <p>
          This will call the backend issuer and ask for a basic student credential
          for your DID.
        </p>
        <button onClick={requestCredential} disabled={loading}>
          {loading ? "Requesting..." : "Request Credential"}
        </button>
        <button onClick={clearCredentials} style={{ marginLeft: "0.5rem" }}>
          Clear Stored Credentials
        </button>
      </section>

      <section className="card">
        <h2>4. Stored Credentials</h2>
        {credentials.length === 0 && <p>No credentials stored yet.</p>}
        {credentials.map((vc, idx) => (
          <details key={vc.id + idx} style={{ marginBottom: "1rem" }}>
            <summary>{vc.type.join(", ")} – {vc.id}</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {JSON.stringify(vc, null, 2)}
            </pre>
          </details>
        ))}
      </section>
            <section className="card">
        <h2>5. Verify a Credential</h2>
        <p>Paste a Verifiable Credential JSON below and click "Verify".</p>
        <textarea
          style={{ width: "100%", minHeight: "160px" }}
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          placeholder="Paste VC JSON here..."
        />
        <button onClick={handleVerifyCredential} disabled={loading}>
          {loading ? "Verifying..." : "Verify Credential"}
        </button>
        {verifyResult && (
          <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>{verifyResult}</p>
        )}
      </section>


      <section className="status">
        <strong>Status:</strong> {status || "Idle"}
      </section>

            <section className="card">
        <h2>6. Backup & Recovery</h2>
        <p>
          Create an encrypted backup of your wallet state (DID, address, and credentials).
          The encryption key is derived from your password. Keep the password safe!
        </p>

        <h3>Create Backup</h3>
        <input
          type="password"
          placeholder="Backup password"
          value={backupPassword}
          onChange={(e) => setBackupPassword(e.target.value)}
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <button onClick={handleCreateBackup}>Create Encrypted Backup</button>

        {backupData && (
          <>
            <p style={{ marginTop: "0.5rem" }}>Encrypted backup blob (copy & store somewhere safe):</p>
            <textarea
              style={{ width: "100%", minHeight: "100px" }}
              value={backupData}
              onChange={(e) => setBackupData(e.target.value)}
            />
          </>
        )}

        <h3 style={{ marginTop: "1rem" }}>Restore from Backup</h3>
        <p>Paste your encrypted backup blob above and enter the original password.</p>
        <input
          type="password"
          placeholder="Restore password"
          value={restorePassword}
          onChange={(e) => setRestorePassword(e.target.value)}
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <button onClick={handleRestoreBackup}>Restore Backup</button>

        {backupMessage && (
          <p style={{ marginTop: "0.5rem" }}>{backupMessage}</p>
        )}
      </section>

    </div>
  );
}

export default App;
