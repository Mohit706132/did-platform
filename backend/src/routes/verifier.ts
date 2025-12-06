// backend/src/routes/verifier.ts
import express, { Request, Response } from 'express';
import { User, VerificationRequest, Credential, ISession } from '../models';
import { validateSession } from './auth';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const router = express.Router();

// Middleware to check if user is verifier
async function requireVerifierRole(req: Request & { session?: ISession }, res: Response, next: any) {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'Session required' });
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'verifier') {
      return res.status(403).json({ error: 'Verifier role required' });
    }

    next();
  } catch (err: any) {
    const errorId = logger.error('Verifier role check error', '/api/verifier', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
}

// POST /api/verifier/request - Create credential verification request
router.post('/request', validateSession, requireVerifierRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const {
      holderEmail,
      requestedCredentialTypes,
      requestedFields,
      purpose,
      expiresInMinutes,
    } = req.body;

    if (!holderEmail || !requestedCredentialTypes || !purpose) {
      return res.status(400).json({
        error: 'Missing required fields: holderEmail, requestedCredentialTypes, purpose',
      });
    }

    // Find the holder by email
    const holder = await User.findOne({ email: holderEmail.toLowerCase().trim() });
    if (!holder) {
      return res.status(404).json({ error: 'Holder not found with that email' });
    }

    if (holder.role !== 'holder') {
      return res.status(400).json({ error: 'User is not a credential holder' });
    }

    const userId = req.session!.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Verifier user not found' });
    }

    // Create verifier DID if not exists
    const verifierDid = `did:verifier:${user._id}`;
    const holderDid = `did:holder:${holder._id}`;

    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + (expiresInMinutes || 1440) * 60 * 1000); // Default 24 hours

    const verificationRequest = new VerificationRequest({
      requestId,
      verifierId: userId,
      verifierDid,
      holderId: holder._id,
      holderDid,
      requestedCredentialTypes,
      requestedFields: requestedFields || {},
      purpose: purpose.trim(),
      status: 'pending',
      expiresAt,
    });

    await verificationRequest.save();

    logger.info('Verification request created', { requestId, verifierId: userId, holderId: holder._id });

    res.status(201).json({
      success: true,
      request: {
        requestId: verificationRequest.requestId,
        verifierDid: verificationRequest.verifierDid,
        holderEmail: holder.email,
        holderName: `${holder.firstName} ${holder.lastName}`,
        requestedCredentialTypes: verificationRequest.requestedCredentialTypes,
        requestedFields: verificationRequest.requestedFields,
        purpose: verificationRequest.purpose,
        status: verificationRequest.status,
        expiresAt: verificationRequest.expiresAt,
        createdAt: verificationRequest.createdAt,
      },
      message: 'Verification request sent to holder successfully',
    });
  } catch (err: any) {
    const errorId = logger.error('Create verification request error', '/api/verifier/request', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// GET /api/verifier/requests - Get all verification requests
router.get('/requests', validateSession, requireVerifierRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const userId = req.session!.userId;
    const { status } = req.query;

    const filter: any = { verifierId: userId };
    if (status) filter.status = status;

    const requests = await VerificationRequest.find(filter)
      .populate('holderId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: requests.length,
      requests: requests.map((r: any) => ({
        requestId: r.requestId,
        holderDid: r.holderDid,
        holderEmail: r.holderId?.email,
        holderName: r.holderId ? `${r.holderId.firstName} ${r.holderId.lastName}` : 'Unknown',
        requestedCredentialTypes: r.requestedCredentialTypes,
        requestedFields: r.requestedFields,
        purpose: r.purpose,
        status: r.status,
        responseAt: r.responseAt,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        sharedCredentials: r.sharedCredentials,
      })),
    });
  } catch (err: any) {
    const errorId = logger.error('Get verification requests error', '/api/verifier/requests', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// GET /api/verifier/request/:requestId - Get single verification request
router.get('/request/:requestId', validateSession, requireVerifierRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.session!.userId;

    const request = await VerificationRequest.findOne({ requestId, verifierId: userId });
    if (!request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    res.json({
      success: true,
      request: {
        requestId: request.requestId,
        verifierDid: request.verifierDid,
        holderDid: request.holderDid,
        requestedCredentialTypes: request.requestedCredentialTypes,
        requestedFields: request.requestedFields,
        purpose: request.purpose,
        status: request.status,
        sharedCredentials: request.sharedCredentials,
        responseAt: request.responseAt,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
      },
    });
  } catch (err: any) {
    const errorId = logger.error('Get verification request error', '/api/verifier/request/:requestId', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// POST /api/verifier/verify - Verify shared credentials
router.post('/verify', validateSession, requireVerifierRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { credentials } = req.body;

    if (!credentials || !Array.isArray(credentials)) {
      return res.status(400).json({ error: 'Credentials array required' });
    }

    const verificationResults = [];

    for (const cred of credentials) {
      try {
        // Basic validation
        if (!cred.credentialSubject || !cred.issuer) {
          verificationResults.push({
            credentialId: cred.id || 'unknown',
            valid: false,
            reason: 'Missing required fields',
          });
          continue;
        }

        // Check if credential exists and is active
        const storedCred = await Credential.findOne({
          credentialId: cred.id,
          status: 'ACTIVE',
        });

        if (!storedCred) {
          verificationResults.push({
            credentialId: cred.id,
            valid: false,
            reason: 'Credential not found or inactive',
          });
          continue;
        }

        // Check expiration
        if (storedCred.expiresAt && new Date() > storedCred.expiresAt) {
          verificationResults.push({
            credentialId: cred.id,
            valid: false,
            reason: 'Credential expired',
          });
          continue;
        }

        verificationResults.push({
          credentialId: cred.id,
          valid: true,
          reason: 'Credential verified successfully',
          credentialType: cred.type,
          issuer: cred.issuer,
        });
      } catch (err) {
        verificationResults.push({
          credentialId: cred.id || 'unknown',
          valid: false,
          reason: 'Verification error',
        });
      }
    }

    logger.info('Credentials verified', { count: verificationResults.length });

    res.json({
      success: true,
      count: verificationResults.length,
      results: verificationResults,
    });
  } catch (err: any) {
    const errorId = logger.error('Verify credentials error', '/api/verifier/verify', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// POST /api/verifier/verify-credential - Verify a single credential by ID (from QR code)
router.post('/verify-credential', validateSession, requireVerifierRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { credentialId, holderEmail } = req.body;

    if (!credentialId) {
      return res.status(400).json({ error: 'credentialId is required' });
    }

    const userId = req.session!.userId;
    const verifier = await User.findById(userId);
    if (!verifier) {
      return res.status(404).json({ error: 'Verifier not found' });
    }

    // Find the credential
    const credential = await Credential.findOne({ credentialId })
      .populate('subjectId', 'email firstName lastName')
      .populate('issuerId', 'email firstName lastName');

    if (!credential) {
      return res.json({
        success: false,
        valid: false,
        message: 'Credential not found in system',
      });
    }

    // Verify holder email if provided
    if (holderEmail && credential.subjectId) {
      const holder = credential.subjectId as any;
      if (holder.email !== holderEmail) {
        return res.json({
          success: false,
          valid: false,
          message: 'Credential holder email mismatch',
        });
      }
    }

    // Check status
    if (credential.status === 'REVOKED') {
      return res.json({
        success: true,
        valid: false,
        message: 'Credential has been revoked',
        credential: {
          credentialId: credential.credentialId,
          type: credential.credentialData.type,
          status: credential.status,
        },
      });
    }

    // Check expiration
    if (credential.expiresAt && new Date() > credential.expiresAt) {
      return res.json({
        success: true,
        valid: false,
        message: 'Credential has expired',
        credential: {
          credentialId: credential.credentialId,
          type: credential.credentialData.type,
          expiresAt: credential.expiresAt,
        },
      });
    }

    const holder = credential.subjectId as any;
    const issuer = credential.issuerId as any;

    res.json({
      success: true,
      valid: true,
      message: 'Credential is valid',
      credential: {
        credentialId: credential.credentialId,
        type: credential.credentialData.type,
        status: credential.status,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        holder: {
          email: holder?.email,
          name: `${holder?.firstName} ${holder?.lastName}`,
        },
        issuer: {
          email: issuer?.email,
          name: `${issuer?.firstName} ${issuer?.lastName}`,
        },
        claims: credential.credentialData.credentialSubject,
      },
    });

    logger.info('Credential verified', { credentialId, verifierId: userId });
  } catch (err: any) {
    const errorId = logger.error('Verify credential error', '/api/verifier/verify-credential', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

export default router;
