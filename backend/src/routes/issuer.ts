// backend/src/routes/issuer.ts
import express, { Request, Response } from 'express';
import { User, IssuerRegistry, CredentialRequest, ISession } from '../models';
import { validateSession } from './auth';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const router = express.Router();

// Middleware to check if user is issuer
async function requireIssuerRole(req: Request & { session?: ISession }, res: Response, next: any) {
  try {
    if (!req.session) {
      return res.status(401).json({ error: 'Session required' });
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'issuer') {
      return res.status(403).json({ error: 'Issuer role required' });
    }

    next();
  } catch (err: any) {
    const errorId = logger.error('Issuer role check error', '/api/issuer', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
}

// POST /api/issuer/register - Register as issuer organization
router.post('/register', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const {
      organizationName,
      organizationType,
      country,
      authorizedCredentialTypes,
      verificationDocument,
      publicKey,
      metadata,
    } = req.body;

    if (!organizationName || !organizationType || !country) {
      return res.status(400).json({
        error: 'Missing required fields: organizationName, organizationType, country',
      });
    }

    const userId = req.session!.userId;

    // Check if issuer already registered
    const existingIssuer = await IssuerRegistry.findOne({ userId });
    if (existingIssuer) {
      return res.status(400).json({ error: 'Issuer already registered' });
    }

    // Get user wallet for DID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create issuer DID
    const issuerDid = `did:issuer:${randomUUID()}`;

    const issuer = new IssuerRegistry({
      userId,
      issuerDid,
      organizationName: organizationName.trim(),
      organizationType: organizationType.trim(),
      country: country.trim(),
      authorizedCredentialTypes: authorizedCredentialTypes || [],
      verificationStatus: 'pending',
      verificationDocument,
      publicKey,
      metadata: metadata || {},
    });

    await issuer.save();

    logger.info('Issuer registered', { userId, organizationName });

    res.status(201).json({
      success: true,
      issuer: {
        issuerId: issuer._id,
        issuerDid: issuer.issuerDid,
        organizationName: issuer.organizationName,
        organizationType: issuer.organizationType,
        country: issuer.country,
        verificationStatus: issuer.verificationStatus,
        authorizedCredentialTypes: issuer.authorizedCredentialTypes,
      },
      message: 'Issuer registered successfully. Pending verification.',
    });
  } catch (err: any) {
    const errorId = logger.error('Issuer registration error', '/api/issuer/register', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// GET /api/issuer/profile - Get issuer profile
router.get('/profile', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const userId = req.session!.userId;

    const issuer = await IssuerRegistry.findOne({ userId });
    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not registered' });
    }

    res.json({
      success: true,
      issuer: {
        issuerId: issuer._id,
        issuerDid: issuer.issuerDid,
        organizationName: issuer.organizationName,
        organizationType: issuer.organizationType,
        country: issuer.country,
        verificationStatus: issuer.verificationStatus,
        authorizedCredentialTypes: issuer.authorizedCredentialTypes,
        approvedAt: issuer.approvedAt,
        createdAt: issuer.createdAt,
        metadata: issuer.metadata,
      },
    });
  } catch (err: any) {
    const errorId = logger.error('Get issuer profile error', '/api/issuer/profile', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// PUT /api/issuer/profile - Update issuer profile
router.put('/profile', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const userId = req.session!.userId;
    const { organizationName, organizationType, authorizedCredentialTypes, metadata } = req.body;

    const issuer = await IssuerRegistry.findOne({ userId });
    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not registered' });
    }

    if (organizationName) issuer.organizationName = organizationName.trim();
    if (organizationType) issuer.organizationType = organizationType.trim();
    if (authorizedCredentialTypes) issuer.authorizedCredentialTypes = authorizedCredentialTypes;
    if (metadata) issuer.metadata = { ...issuer.metadata, ...metadata };

    await issuer.save();

    logger.info('Issuer profile updated', { userId });

    res.json({
      success: true,
      issuer: {
        issuerId: issuer._id,
        issuerDid: issuer.issuerDid,
        organizationName: issuer.organizationName,
        organizationType: issuer.organizationType,
        verificationStatus: issuer.verificationStatus,
        authorizedCredentialTypes: issuer.authorizedCredentialTypes,
      },
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    const errorId = logger.error('Update issuer profile error', '/api/issuer/profile', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// GET /api/issuer/verify/:issuerDid - Verify if DID is authorized issuer
router.get('/verify/:issuerDid', async (req: Request, res: Response) => {
  try {
    const { issuerDid } = req.params;

    const issuer = await IssuerRegistry.findOne({ issuerDid });
    if (!issuer) {
      return res.json({
        success: true,
        verified: false,
        message: 'Issuer not found',
      });
    }

    res.json({
      success: true,
      verified: issuer.verificationStatus === 'verified',
      issuer: {
        issuerDid: issuer.issuerDid,
        organizationName: issuer.organizationName,
        organizationType: issuer.organizationType,
        country: issuer.country,
        verificationStatus: issuer.verificationStatus,
        authorizedCredentialTypes: issuer.authorizedCredentialTypes,
      },
    });
  } catch (err: any) {
    const errorId = logger.error('Verify issuer error', '/api/issuer/verify', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// GET /api/issuer/list - List all verified issuers (public)
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { country, credentialType } = req.query;

    const filter: any = { verificationStatus: 'verified' };
    if (country) filter.country = country;
    if (credentialType) filter.authorizedCredentialTypes = credentialType;

    const issuers = await IssuerRegistry.find(filter)
      .select('issuerDid organizationName organizationType country authorizedCredentialTypes')
      .limit(100);

    res.json({
      success: true,
      count: issuers.length,
      issuers: issuers.map((i) => ({
        issuerDid: i.issuerDid,
        organizationName: i.organizationName,
        organizationType: i.organizationType,
        country: i.country,
        authorizedCredentialTypes: i.authorizedCredentialTypes,
      })),
    });
  } catch (err: any) {
    const errorId = logger.error('List issuers error', '/api/issuer/list', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// ===== NEW WORKFLOW: Handle credential requests from users =====

// GET /api/issuer/pending-requests - Get all pending document requests for this issuer
router.get('/pending-requests', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const user = await User.findById(req.session!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const issuerProfile = await IssuerRegistry.findOne({ userId: user._id });
    if (!issuerProfile) {
      return res.status(404).json({ error: 'Issuer profile not found. Please register as issuer first.' });
    }

    // Find all pending requests for this issuer's organization (case-insensitive)
    const requests = await CredentialRequest.find({
      issuerName: { $regex: new RegExp(`^${issuerProfile.organizationName}$`, 'i') },
      status: 'pending',
    }).sort({ createdAt: -1 });

    logger.info('Fetched pending requests', { 
      issuerId: user._id, 
      organizationName: issuerProfile.organizationName, 
      count: requests.length 
    });

    res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err: any) {
    const errorId = logger.error('Get pending requests error', '/api/issuer/pending-requests', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// POST /api/issuer/approve-request - Approve a credential request and issue the credential
router.post('/approve-request', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { requestId, credentialData } = req.body;

    if (!requestId || !credentialData) {
      return res.status(400).json({ error: 'requestId and credentialData are required' });
    }

    const user = await User.findById(req.session!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const issuerProfile = await IssuerRegistry.findOne({ userId: user._id });
    if (!issuerProfile) {
      return res.status(404).json({ error: 'Issuer profile not found' });
    }

    const { CredentialRequest, Credential } = require('../models');

    const request = await CredentialRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    // Find the user who made the request
    const requestUser = await User.findById(request.userId);
    if (!requestUser) {
      return res.status(404).json({ error: 'Request user not found' });
    }

    // Create the credential
    const { issueCredential } = require('../issuerService');
    
    const credential = await issueCredential({
      issuerDid: issuerProfile.issuerDid,
      subjectDid: `did:user:${requestUser.email}`,
      claims: credentialData,
      type: ["VerifiableCredential", `${request.documentType}Credential`],
      metadata: {
        credentialType: request.documentType,
        purpose: 'identity-verification',
        requestId: request._id.toString(),
      },
    });

    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date();
    request.approvedBy = user._id;
    request.credentialId = credential.credentialId;
    await request.save();

    logger.info('Credential request approved and issued', {
      requestId,
      issuer: issuerProfile.organizationName,
      user: requestUser.email,
    });

    res.json({
      success: true,
      message: 'Credential issued successfully',
      credential: {
        credentialId: credential.credentialId,
        type: credential.credentialData.type,
        issuedAt: credential.issuedAt,
      },
    });
  } catch (err: any) {
    const errorId = logger.error('Approve request error', '/api/issuer/approve-request', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

// POST /api/issuer/reject-request - Reject a credential request
router.post('/reject-request', validateSession, requireIssuerRole, async (req: Request & { session?: ISession }, res: Response) => {
  try {
    const { requestId, reason } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }

    const { CredentialRequest } = require('../models');

    const request = await CredentialRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || 'No reason provided';
    await request.save();

    logger.info('Credential request rejected', { requestId, reason });

    res.json({
      success: true,
      message: 'Request rejected',
    });
  } catch (err: any) {
    const errorId = logger.error('Reject request error', '/api/issuer/reject-request', err);
    res.status(500).json({ error: 'Internal error', errorId });
  }
});

export default router;
