// backend/src/routes/credentials.ts
import express, { Request, Response } from 'express';
import { Credential, CredentialUsageLog, CredentialRevocation, ISession } from '../models';
import { issueCredential } from '../issuerService';
import { verifyCredential } from '../verifyService';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/auditLog';
import { validateSession } from './auth';

const router = express.Router();

// POST /api/credentials/issue
router.post('/issue', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { subjectDid, claims, expirationDate, type, metadata } = req.body;
    const session = req.session!;

    if (!subjectDid || !claims) {
      return res.status(400).json({ error: 'Subject DID and claims are required' });
    }

    if (typeof claims !== 'object' || Array.isArray(claims)) {
      return res.status(400).json({ error: 'Claims must be a JSON object' });
    }

    // Create credential using issuerService
    const vc = await issueCredential({
      subjectDid,
      claims,
      expirationDate,
      type,
      metadata,
    });

    // Store in database
    const credential = new Credential({
      credentialId: vc.id,
      issuerId: session.userId,
      subjectId: session.userId, // In this case, issuer creates for themselves
      subjectDid,
      credentialData: vc,
      status: 'ACTIVE',
      usageCount: 0,
      maxUsages: 1,
      issuedAt: new Date(),
      expiresAt: expirationDate ? new Date(expirationDate) : undefined,
    });

    await credential.save();

    logger.info('Credential issued successfully', {
      credentialId: vc.id,
      subjectDid,
    });

    auditLogger.logIssueCredential(subjectDid, vc.id, {
      purpose: metadata?.purpose || 'general',
      type: type || ['VerifiableCredential'],
    });

    res.status(201).json({
      success: true,
      credentialId: vc.id,
      credential: vc,
      status: 'ACTIVE',
      issuedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const errorId = logger.error('Issue credential error', '/api/credentials/issue', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// GET /api/credentials
router.get('/', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const session = req.session!;
    const { status, limit = 50, skip = 0 } = req.query;

    const query: any = {
      $or: [
        { subjectId: session.userId },
        { issuerId: session.userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const credentials = await Credential.find(query)
      .select('-credentialData.proof') // Exclude proof to reduce payload
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });

    const total = await Credential.countDocuments(query);

    res.json({
      success: true,
      credentials,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err: any) {
    const errorId = logger.error('Fetch credentials error', '/api/credentials', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// GET /api/credentials/:credentialId
router.get('/:credentialId', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { credentialId } = req.params;
    const session = req.session!;

    const credential = await Credential.findOne({ credentialId });
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Check if user has access (owner or issuer)
    if (credential.subjectId.toString() !== session.userId.toString() &&
        credential.issuerId?.toString() !== session.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      credential,
    });
  } catch (err: any) {
    const errorId = logger.error('Fetch credential error', '/api/credentials/:credentialId', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/credentials/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { credential, presenterDid, timestamp } = req.body;

    if (!credential || !presenterDid) {
      return res.status(400).json({ error: 'Credential and presenter DID are required' });
    }

    // Verify using verifyService
    const result = await verifyCredential(credential);

    if (!result.valid) {
      // Log failed verification
      const usageLog = new CredentialUsageLog({
        credentialId: credential.id,
        presenterId: presenterDid,
        result: 'FAILED',
        reason: result.reason,
        ipAddress: req.ip || 'unknown',
      });
      await usageLog.save();

      logger.error('Verification failed', '/api/credentials/verify', result.reason);
      return res.status(400).json({
        success: false,
        valid: false,
        reason: result.reason,
      });
    }

    // Check presenter is subject
    const subjectDid = credential.credentialSubject?.id;
    if (subjectDid !== presenterDid) {
      const usageLog = new CredentialUsageLog({
        credentialId: credential.id,
        presenterId: presenterDid,
        result: 'FAILED',
        reason: 'Presenter DID does not match credential subject',
        ipAddress: req.ip || 'unknown',
      });
      await usageLog.save();

      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'Presenter DID does not match credential subject',
      });
    }

    // Check if credential already used (one-time enforcement)
    const credentialRecord = await Credential.findOne({ credentialId: credential.id });
    if (credentialRecord) {
      if (credentialRecord.status === 'USED') {
        const usageLog = new CredentialUsageLog({
          credentialId: credential.id,
          presenterId: presenterDid,
          result: 'FAILED',
          reason: 'Credential has already been used (one-time credential)',
          ipAddress: req.ip || 'unknown',
        });
        await usageLog.save();

        return res.status(400).json({
          success: false,
          valid: false,
          reason: 'Credential has already been used (one-time credential)',
        });
      }

      if (credentialRecord.status === 'REVOKED') {
        const usageLog = new CredentialUsageLog({
          credentialId: credential.id,
          presenterId: presenterDid,
          result: 'FAILED',
          reason: 'Credential has been revoked',
          ipAddress: req.ip || 'unknown',
        });
        await usageLog.save();

        return res.status(400).json({
          success: false,
          valid: false,
          reason: 'Credential has been revoked',
        });
      }

      // Update credential status to USED
      credentialRecord.status = 'USED';
      credentialRecord.usageCount = (credentialRecord.usageCount || 0) + 1;
      credentialRecord.updatedAt = new Date();
      await credentialRecord.save();
    }

    // Log successful verification
    const usageLog = new CredentialUsageLog({
      credentialId: credential.id,
      presenterId: presenterDid,
      result: 'SUCCESS',
      ipAddress: req.ip || 'unknown',
    });
    await usageLog.save();

    logger.info('Credential verified successfully', { credentialId: credential.id });
    auditLogger.logVerifyCredential(credential.id, presenterDid, true);

    res.json({
      success: true,
      valid: true,
      message: 'Credential verified successfully',
      credentialData: {
        type: credential.type,
        issuer: credential.issuer,
        subject: credential.credentialSubject?.id,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate,
        claims: credential.credentialSubject,
      },
    });
  } catch (err: any) {
    const errorId = logger.error('Verification error', '/api/credentials/verify', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/credentials/:credentialId/revoke
router.post('/:credentialId/revoke', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { credentialId } = req.params;
    const { reason } = req.body;
    const session = req.session!;

    const credential = await Credential.findOne({ credentialId });
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    // Check authorization (only issuer or subject can revoke)
    if (credential.issuerId?.toString() !== session.userId.toString() &&
        credential.subjectId.toString() !== session.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (credential.status === 'REVOKED') {
      return res.status(400).json({ error: 'Credential is already revoked' });
    }

    // Update status
    credential.status = 'REVOKED';
    credential.updatedAt = new Date();
    await credential.save();

    // Log revocation
    const revocation = new CredentialRevocation({
      credentialId,
      revokedBy: session.userId,
      reason: reason || 'No reason provided',
    });
    await revocation.save();

    logger.info('Credential revoked', { credentialId });
    auditLogger.logRevokeCredential(credentialId, reason);

    res.json({
      success: true,
      credentialId,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const errorId = logger.error('Revocation error', '/api/credentials/:credentialId/revoke', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// GET /api/credentials/:credentialId/usage-log
router.get('/:credentialId/usage-log', validateSession, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { credentialId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Verify user has access to this credential
    const credential = await Credential.findOne({ credentialId });
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    const session = req.session!;
    if (credential.issuerId?.toString() !== session.userId.toString() &&
        credential.subjectId.toString() !== session.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const logs = await CredentialUsageLog.find({ credentialId })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ timestamp: -1 });

    const total = await CredentialUsageLog.countDocuments({ credentialId });

    res.json({
      success: true,
      logs,
      total,
      limit: Number(limit),
      skip: Number(skip),
    });
  } catch (err: any) {
    const errorId = logger.error('Audit log fetch error', '/api/credentials/:credentialId/usage-log', err);
    res.status(500).json({ error: 'Internal server error', errorId });
  }
});

export default router;
