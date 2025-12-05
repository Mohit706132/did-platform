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
import { logger } from "./utils/logger"; // Bug #20: Error logging
import { validateIssueRequest, validateRevokeRequest, validateCredentialStructure } from "./utils/validation"; // Bugs #13, #17, #18

const app = express();
const PORT = process.env.PORT || 4000;

// Bug #17: Content-Type validation middleware
app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("application/json")) {
      const errorId = logger.error(
        `Invalid Content-Type: ${contentType}`,
        req.path,
        new Error("Content-Type must be application/json")
      );
      return res.status(415).json({ error: "Unsupported Media Type", errorId });
    }
  }
  next();
});

// Revoke a credential on-chain
app.post("/revoke", async (req, res) => {
  try {
    // Bug #13, #17: Validate input
    const validation = validateRevokeRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors });
    }

    const { credentialId } = req.body;
    await revokeCredential(credentialId);
    logger.info(`Credential revoked successfully`, { credentialId });
    res.json({ status: "revoked" });
  } catch (err: any) {
    // Bug #20: Use logger instead of console.error
    const errorId = logger.error("Error revoking credential", "/revoke", err);
    res.status(500).json({ error: "Internal error", errorId });
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
    // Bug #13, #17: Validate input
    const validation = validateIssueRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors });
    }

    const { subjectDid, claims, expirationDate, type, metadata } = validation.data!;

    const vc = await issueCredential({
      subjectDid,
      claims,
      expirationDate,
      type,
      metadata
    });

    res.json(vc);
  } catch (err: any) {
    // Bug #20: Use logger instead of console.error
    const errorId = logger.error("Error issuing credential", "/issue", err);
    res.status(500).json({ error: "Internal error", errorId });
  }
});

// Verify a credential (privacy-first: we do not store it)
app.post("/verify", async (req, res) => {
  try {
    // Bug #13, #17: Validate credential structure
    const validation = validateCredentialStructure(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors });
    }

    const vc = req.body as VerifiableCredential;
    const result = await verifyCredential(vc);

    // Privacy-first: do NOT store full VC or credentialSubject
    res.json(result);
  } catch (err: any) {
    // Bug #20: Use logger instead of console.error
    const errorId = logger.error("Error verifying credential", "/verify", err);
    res.status(500).json({ error: "Internal error", errorId });
  }
});

app.listen(PORT, () => {
  console.log(`Issuer + Verifier backend listening on http://localhost:${PORT}`);
});

