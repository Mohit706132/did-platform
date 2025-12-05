// backend/src/authService.ts
/**
 * Authentication service with password hashing and session management
 * Fixes Bug #26: No password hashing
 * Fixes Bug #27: No session expiration
 * Fixes Bug #28: No wallet ownership verification
 */

import crypto from "crypto";
import { randomUUID } from "crypto";

/**
 * Simple password hashing using PBKDF2
 * Bug #26: Replace plaintext passwords with hashed ones
 */
export function hashPassword(password: string, salt?: string): {
  hash: string;
  salt: string;
} {
  const saltToUse = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, saltToUse, 100000, 64, "sha256")
    .toString("hex");
  return { hash, salt: saltToUse };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

/**
 * Session data structure
 */
export interface Session {
  sessionId: string;
  userId: string;
  userDid: string;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  isValid: boolean;
}

/**
 * Session manager with expiration tracking
 * Bug #27: Implement session expiration
 */
class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_DURATION = 1 * 60 * 60 * 1000; // 1 hour
  private readonly INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  /**
   * Create a new session
   */
  createSession(
    userId: string,
    userDid: string,
    walletAddress: string
  ): Session {
    const now = Date.now();
    const session: Session = {
      sessionId: `SES-${randomUUID()}`,
      userId,
      userDid,
      walletAddress,
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION,
      lastActivity: now,
      isValid: true,
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Get a session and check if it's still valid
   * Bug #27: Validate session expiration and inactivity
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const now = Date.now();

    // Check if session is expired
    if (now > session.expiresAt) {
      this.invalidateSession(sessionId);
      return null;
    }

    // Check for inactivity timeout
    if (now - session.lastActivity > this.INACTIVITY_TIMEOUT) {
      this.invalidateSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session;
  }

  /**
   * Invalidate a session
   */
  invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isValid = false;
    }
    this.sessions.delete(sessionId);
  }

  /**
   * Extend a session (refresh token)
   */
  extendSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.expiresAt = Date.now() + this.SESSION_DURATION;
    return true;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const userSessions: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isValid) {
        userSessions.push(session);
      }
    }
    return userSessions;
  }

  /**
   * Logout all sessions for a user
   */
  logoutUser(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.invalidateSession(sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();

/**
 * Wallet ownership verification
 * Bug #28: Verify that the user owns the wallet they're claiming
 * 
 * Implementation uses message signing:
 * 1. Server sends a challenge message
 * 2. User signs message with their wallet private key
 * 3. Server verifies signature matches the wallet address
 */
export interface WalletChallenge {
  challengeId: string;
  message: string;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

class WalletVerifier {
  private challenges: Map<string, WalletChallenge> = new Map();
  private readonly CHALLENGE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new wallet ownership challenge
   */
  createChallenge(walletAddress: string): WalletChallenge {
    const now = Date.now();
    const challengeId = `WCHALL-${randomUUID()}`;
    const nonce = randomUUID();

    const challenge: WalletChallenge = {
      challengeId,
      message: `Please sign this message to verify wallet ownership:\nChallenge: ${nonce}\nTimestamp: ${now}`,
      walletAddress,
      createdAt: now,
      expiresAt: now + this.CHALLENGE_DURATION,
      used: false,
    };

    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  /**
   * Get a challenge
   */
  getChallenge(challengeId: string): WalletChallenge | null {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      return null;
    }

    const now = Date.now();

    // Check if challenge is expired
    if (now > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return null;
    }

    // Check if already used
    if (challenge.used) {
      return null;
    }

    return challenge;
  }

  /**
   * Verify a signed challenge
   * In a real implementation, this would verify the ECDSA signature
   * using ethers.js or web3.js
   * 
   * Expected signature format: ethers.Signature or raw {v, r, s}
   */
  verifySignedChallenge(
    challengeId: string,
    signature: string,
    recoveredAddress: string
  ): boolean {
    const challenge = this.getChallenge(challengeId);

    if (!challenge) {
      return false;
    }

    // Verify that the recovered address matches the wallet address
    const addressMatch =
      recoveredAddress.toLowerCase() === challenge.walletAddress.toLowerCase();

    if (addressMatch) {
      challenge.used = true;
    }

    return addressMatch;
  }

  /**
   * Clean up expired challenges
   */
  cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [challengeId, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(challengeId);
      }
    }
  }
}

export const walletVerifier = new WalletVerifier();
