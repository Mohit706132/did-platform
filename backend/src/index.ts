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
import { auditLogger } from "./utils/auditLog"; // Bug #19: Audit logging
import { validateIssueRequest, validateRevokeRequest, validateCredentialStructure } from "./utils/validation"; // Bugs #13, #17, #18
import { connectDatabase } from "./database"; // MongoDB connection
import authRoutes from "./routes/auth";
import credentialRoutes from "./routes/credentials";
import issuerRoutes from "./routes/issuer";
import verifierRoutes from "./routes/verifier";

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 4000;

// CORS middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Bug #17: Content-Type validation middleware for POST requests
app.use((req, res, next) => {
  if (req.method === "POST" && req.body) {
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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cleanup endpoint - Delete all credentials and requests (for development only)
app.post("/api/cleanup", async (req, res) => {
  try {
    const { Credential, CredentialRequest, VerificationRequest } = require('./models');
    
    const deletedCredentials = await Credential.deleteMany({});
    const deletedRequests = await CredentialRequest.deleteMany({});
    const deletedVerificationRequests = await VerificationRequest.deleteMany({});
    
    console.log(`Cleanup: Deleted ${deletedCredentials.deletedCount} credentials, ${deletedRequests.deletedCount} credential requests, and ${deletedVerificationRequests.deletedCount} verification requests`);
    
    res.json({
      success: true,
      message: 'All credentials, credential requests, and verification requests deleted. User accounts and organizations preserved.',
      deleted: {
        credentials: deletedCredentials.deletedCount,
        credentialRequests: deletedRequests.deletedCount,
        verificationRequests: deletedVerificationRequests.deletedCount,
      },
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed', details: error.message });
  }
});

// ===== API ROUTES =====
// Authentication routes
app.use("/api/auth", authRoutes);

// Credential routes
app.use("/api/credentials", credentialRoutes);

// User (Holder) routes
import userRoutes from "./routes/user";
app.use("/api/user", userRoutes);

// Issuer routes
app.use("/api/issuer", issuerRoutes);

// Verifier routes
app.use("/api/verifier", verifierRoutes);

// ===== LEGACY ROUTES (Kept for backward compatibility) =====

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
    // Bug #19: Audit logging for credential revocation
    auditLogger.logRevokeCredential(credentialId);
    res.json({ status: "revoked" });
  } catch (err: any) {
    // Bug #20: Use logger instead of console.error
    const errorId = logger.error("Error revoking credential", "/revoke", err);
    // Bug #19: Audit logging for failed revocation
    auditLogger.logRevokeCredential(req.body?.credentialId, undefined, err?.message);
    res.status(500).json({ error: "Internal error", errorId });
  }
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
      metadata: metadata || {}
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorId = logger.error("Unhandled error", req.path, err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    errorId,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// Connect to database and start server
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`✅ DID Platform backend running on http://localhost:${PORT}`);
      console.log(`📚 API docs:`);
      console.log(`   Auth: POST /api/auth/register, /api/auth/login, /api/auth/wallet/challenge, /api/auth/wallet/verify`);
      console.log(`   Credentials: POST /api/credentials/issue, /api/credentials/verify, GET /api/credentials`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();


