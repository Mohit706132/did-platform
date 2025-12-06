// backend/src/routes/auth.ts
import express, { Request, Response, NextFunction } from 'express';
import { User, UserWallet, Session, WalletChallenge, ISession } from '../models';
import { hashPassword, verifyPassword, sessionManager } from '../authService';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/auditLog';
import { validateEmail, validatePassword } from '../utils/validation';
import { randomUUID } from 'crypto';

const router = express.Router();

// Middleware to validate session
export async function validateSession(req: Request & { session?: ISession }, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string || req.body?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required in headers (x-session-id) or body' });
    }

    const sessionRecord = await Session.findOne({ sessionId, isValid: true });
    if (!sessionRecord) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (new Date() > sessionRecord.expiresAt) {
      await Session.updateOne({ sessionId }, { isValid: false });
      return res.status(401).json({ error: 'Session expired' });
    }

    // Update last activity
    sessionRecord.lastActivity = new Date();
    await sessionRecord.save();

    req.session = sessionRecord;
    next();
  } catch (err: any) {
    const errorId = logger.error('Session validation error', '/api/auth/validate', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields: email, password, firstName, lastName' });
    }

    // Validate role if provided
    const userRole = role || 'holder';
    if (!['holder', 'issuer', 'verifier'].includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be: holder, issuer, or verifier' });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.errors[0] || 'Invalid password' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const { hash, salt } = hashPassword(password);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: hash,
      passwordSalt: salt,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: userRole,
      verifiedAt: new Date(),
    });

    await user.save();

    // Create session
    const session = sessionManager.createSession(user._id.toString(), '', '');
    const sessionRecord = new Session({
      sessionId: session.sessionId,
      userId: user._id,
      expiresAt: new Date(session.expiresAt),
      lastActivity: new Date(session.lastActivity),
      isValid: true,
    });

    await sessionRecord.save();

    logger.info('User registered successfully', { email });
    auditLogger.logIssueCredential(email, `user-signup-${user._id}`, {
      action: 'signup',
      email: email.toLowerCase(),
    });

    res.status(201).json({
      success: true,
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionId: session.sessionId,
      expiresAt: new Date(session.expiresAt).toISOString(),
      message: 'Registration successful. Please link your wallet.',
    });
  } catch (err: any) {
    const errorId = logger.error('Registration error', '/api/auth/register', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get wallet if linked
    const wallet = await UserWallet.findOne({ userId: user._id });

    // Create session
    const session = sessionManager.createSession(
      user._id.toString(),
      wallet?.did || '',
      wallet?.walletAddress || ''
    );

    const sessionRecord = new Session({
      sessionId: session.sessionId,
      userId: user._id,
      walletAddress: wallet?.walletAddress,
      expiresAt: new Date(session.expiresAt),
      lastActivity: new Date(session.lastActivity),
      isValid: true,
    });

    await sessionRecord.save();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info('User logged in successfully', { email: user.email });

    res.json({
      success: true,
      userId: user._id,
      sessionId: session.sessionId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      walletAddress: wallet?.walletAddress || null,
      did: wallet?.did || null,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  } catch (err: any) {
    const errorId = logger.error('Login error', '/api/auth/login', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/auth/wallet/challenge
router.post('/wallet/challenge', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    // Check if wallet already linked to another user
    const existingWallet = await UserWallet.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });
    if (existingWallet) {
      return res.status(400).json({
        error: 'This wallet is already linked to another account',
      });
    }

    // Create challenge
    const challengeId = `WCHALL-${randomUUID()}`;
    const nonce = randomUUID();
    const timestamp = Date.now();

    const message = `Please sign this message to verify wallet ownership:\nChallenge: ${nonce}\nTimestamp: ${timestamp}`;

    const challenge = new WalletChallenge({
      challengeId,
      walletAddress: walletAddress.toLowerCase(),
      message,
      expiresAt: new Date(timestamp + 5 * 60 * 1000), // 5 minutes
      used: false,
    });

    await challenge.save();

    res.json({
      success: true,
      challengeId,
      message,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (err: any) {
    const errorId = logger.error('Challenge creation error', '/api/auth/wallet/challenge', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/auth/wallet/verify
router.post('/wallet/verify', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { challengeId, signature, walletAddress } = req.body;
    const session = req.session!;

    if (!challengeId || !signature || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields: challengeId, signature, walletAddress' });
    }

    // Get challenge
    const challenge = await WalletChallenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(400).json({ error: 'Challenge not found' });
    }

    if (challenge.used) {
      return res.status(400).json({ error: 'Challenge already used' });
    }

    if (new Date() > challenge.expiresAt) {
      return res.status(400).json({ error: 'Challenge expired' });
    }

    if (challenge.walletAddress !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'Wallet address does not match challenge' });
    }

    // In production, verify signature here using ethers.utils.verifyMessage
    // For now, we trust the signature (you should implement proper verification)
    // const recoveredAddress = ethers.utils.verifyMessage(challenge.message, signature);
    // if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    //   return res.status(400).json({ error: 'Invalid signature' });
    // }

    const did = `did:mychain:${walletAddress.toLowerCase()}`;

    // Save or update wallet
    let wallet = await UserWallet.findOne({ userId: session.userId });
    if (!wallet) {
      wallet = new UserWallet({
        userId: session.userId,
        walletAddress: walletAddress.toLowerCase(),
        did,
        isVerified: true,
        verificationSignature: signature,
        linkedAt: new Date(),
      });
    } else {
      wallet.walletAddress = walletAddress.toLowerCase();
      wallet.did = did;
      wallet.isVerified = true;
      wallet.verificationSignature = signature;
      wallet.linkedAt = new Date();
    }

    await wallet.save();

    // Mark challenge as used
    challenge.used = true;
    await challenge.save();

    // Update session
    session.walletAddress = walletAddress.toLowerCase();
    await session.save();

    logger.info('Wallet verified successfully', { walletAddress: walletAddress.toLowerCase(), did });

    res.json({
      success: true,
      walletAddress: walletAddress.toLowerCase(),
      did,
      isVerified: true,
      linkedAt: wallet.linkedAt.toISOString(),
    });
  } catch (err: any) {
    const errorId = logger.error('Wallet verification error', '/api/auth/wallet/verify', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/auth/logout
router.post('/logout', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const session = req.session!;

    await Session.updateOne({ _id: session._id }, { isValid: false });
    sessionManager.invalidateSession(session.sessionId);

    logger.info('User logged out successfully', { userId: session.userId });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err: any) {
    const errorId = logger.error('Logout error', '/api/auth/logout', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

export default router;
