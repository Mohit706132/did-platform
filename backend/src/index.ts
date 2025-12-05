// backend/src/index.ts
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { issueCredential } from "./issuerService";
import { verifyCredential } from "./verifyService";
import type { VerifiableCredential } from "shared";
import { revokeCredential } from "./didRegistryClient";


const app = express();
const PORT = process.env.PORT || 4000;

// Revoke a credential on-chain
app.post("/revoke", async (req, res) => {
  try {
    const { credentialId } = req.body;
    if (!credentialId || typeof credentialId !== "string") {
      return res.status(400).json({ error: "credentialId (string) is required" });
    }

    await revokeCredential(credentialId);
    res.json({ status: "revoked" });
  } catch (err: any) {
    console.error("Error revoking credential:", err);
    res.status(500).json({ error: "Internal error", details: err?.message });
  }
});


app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Issue a credential
app.post("/issue", async (req, res) => {
  try {
    const { subjectDid, claims, expirationDate, type } = req.body;

    if (!subjectDid || typeof subjectDid !== "string") {
      return res.status(400).json({ error: "subjectDid (string) is required" });
    }
    if (!claims || typeof claims !== "object") {
      return res.status(400).json({ error: "claims (object) is required" });
    }

    const vc = await issueCredential({
      subjectDid,
      claims,
      expirationDate,
      type
    });

    res.json(vc);
  } catch (err: any) {
    console.error("Error issuing credential:", err);
    res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

// Verify a credential (privacy-first: we do not store it)
app.post("/verify", async (req, res) => {
  try {
    const vc = req.body as VerifiableCredential;

    if (!vc || typeof vc !== "object") {
      return res.status(400).json({ error: "Credential JSON is required in body" });
    }

    const result = await verifyCredential(vc);

    // Privacy-first: do NOT store full VC or credentialSubject
    // You could log minimal metadata here if you want, but for now we just return result.
    res.json(result);
  } catch (err: any) {
    console.error("Error verifying credential:", err);
    res.status(500).json({ error: "Internal error", details: err?.message });
  }
});

app.listen(PORT, () => {
  console.log(`Issuer + Verifier backend listening on http://localhost:${PORT}`);
});
