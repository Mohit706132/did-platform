// EXAMPLE: How to add session validation middleware to protected endpoints
// Save this as: backend/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from "express";
import { sessionManager } from "../authService";

/**
 * Middleware to validate session on protected routes
 * Add to endpoints that require authentication
 */
export function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const sessionId = req.headers["x-session-id"] as string;

  if (!sessionId) {
    return res.status(401).json({ error: "Missing session ID" });
  }

  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: "Session invalid or expired" });
  }

  // Attach session to request for use in route handlers
  (req as any).session = session;
  next();
}

/**
 * EXAMPLE INTEGRATION in index.ts:
 * 
 * Before:
 *   app.post("/issue", async (req, res) => { ... })
 * 
 * After:
 *   app.post("/issue", validateSession, async (req, res) => { ... })
 * 
 * Then in route handler:
 *   const session = (req as any).session;
 *   const userId = session.userId;
 *   const userDid = session.userDid;
 */

// EXAMPLE: Complete Authentication Endpoints

/**
 * POST /auth/register - User registration
 * Body: { email, password }
 * Returns: { sessionId, userId, userDid }
 */
export async function handleRegister(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // TODO: Validate email format
    // TODO: Hash password with hashPassword()
    // TODO: Save to user database
    // TODO: Create initial DID for user
    // TODO: Create session

    const email = req.body.email;
    // const { hash, salt } = hashPassword(req.body.password);
    // const session = sessionManager.createSession(userId, userDid, walletAddress);
    
    res.json({
      message: "Registration successful",
      sessionId: "SES-xxx",
      userId: "user-xxx",
      userDid: "did:mychain:user-xxx"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /auth/login - User login
 * Body: { email, password }
 * Returns: { sessionId, userId, userDid }
 */
export async function handleLogin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;
    
    // TODO: Look up user by email
    // TODO: Verify password with verifyPassword()
    // TODO: Create session
    // TODO: Return sessionId
    
    res.json({
      message: "Login successful",
      sessionId: "SES-xxx",
      userId: "user-xxx",
      userDid: "did:mychain:user-xxx"
    });
  } catch (err: any) {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

/**
 * POST /auth/logout - User logout
 * Headers: { x-session-id }
 * Returns: { message }
 */
export async function handleLogout(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    if (sessionId) {
      const session = sessionManager.getSession(sessionId);
      if (session) {
        sessionManager.logoutUser(session.userId);
      }
    }
    res.json({ message: "Logout successful" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /auth/wallet/challenge - Create wallet ownership challenge
 * Body: { walletAddress }
 * Returns: { challengeId, message }
 */
export async function handleWalletChallenge(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    
    const challenge = walletVerifier.createChallenge(walletAddress);
    res.json({
      challengeId: challenge.challengeId,
      message: challenge.message,
      expiresAt: challenge.expiresAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /auth/wallet/verify - Verify wallet ownership
 * Body: { challengeId, signature }
 * Returns: { sessionId, userDid, walletAddress }
 * 
 * Note: Signature should be EIP-712 or similar from ethers.js
 * Frontend:
 *   const signature = await signer.signMessage(challenge.message);
 *   const response = await fetch("/auth/wallet/verify", {
 *     method: "POST",
 *     body: JSON.stringify({ challengeId, signature })
 *   });
 */
export async function handleWalletVerify(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { challengeId, signature } = req.body;
    const challenge = walletVerifier.getChallenge(challengeId);
    
    if (!challenge) {
      return res.status(400).json({ error: "Invalid or expired challenge" });
    }
    
    // TODO: Recover address from signature using ethers.js
    // const recoveredAddress = ethers.recoverAddress(challenge.message, signature);
    
    // TODO: Verify challenge
    // const verified = walletVerifier.verifySignedChallenge(
    //   challengeId,
    //   signature,
    //   recoveredAddress
    // );
    
    // TODO: Create session
    // const session = sessionManager.createSession(
    //   userId,
    //   userDid,
    //   recoveredAddress
    // );
    
    res.json({
      message: "Wallet verified",
      sessionId: "SES-xxx",
      userDid: "did:mychain:user-xxx",
      walletAddress: challenge.walletAddress
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /auth/session - Get current session info
 * Headers: { x-session-id }
 * Returns: { sessionId, userId, userDid, walletAddress, expiresAt }
 */
export async function handleGetSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const session = (req as any).session; // From middleware
    if (!session) {
      return res.status(401).json({ error: "No active session" });
    }
    
    res.json({
      sessionId: session.sessionId,
      userId: session.userId,
      userDid: session.userDid,
      walletAddress: session.walletAddress,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /auth/refresh - Extend session expiration
 * Headers: { x-session-id }
 * Returns: { message, expiresAt }
 */
export async function handleRefreshSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const sessionId = req.headers["x-session-id"] as string;
    const extended = sessionManager.extendSession(sessionId);
    
    if (!extended) {
      return res.status(401).json({ error: "Session not found or expired" });
    }
    
    const session = sessionManager.getSession(sessionId);
    res.json({
      message: "Session extended",
      expiresAt: session?.expiresAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * ROUTER SETUP in index.ts:
 * 
 * import { validateSession, handleRegister, handleLogin, ... } from "./middleware/authMiddleware";
 * 
 * app.post("/auth/register", handleRegister);
 * app.post("/auth/login", handleLogin);
 * app.post("/auth/logout", handleLogout);
 * app.post("/auth/wallet/challenge", handleWalletChallenge);
 * app.post("/auth/wallet/verify", handleWalletVerify);
 * app.get("/auth/session", validateSession, handleGetSession);
 * app.post("/auth/refresh", validateSession, handleRefreshSession);
 * 
 * // Protected endpoints require session
 * app.post("/issue", validateSession, issueCredentialHandler);
 * app.post("/verify", validateSession, verifyCredentialHandler);
 * app.post("/revoke", validateSession, revokeCredentialHandler);
 */
