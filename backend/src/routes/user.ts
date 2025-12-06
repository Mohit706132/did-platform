// backend/src/routes/user.ts - User (Holder) specific routes
import { Router, Request, Response } from 'express';
import { CredentialRequest, Credential, User } from '../models';
import { validateSession } from './auth';

const router = Router();

// Middleware to ensure user is a holder
const requireHolderRole = async (req: Request, res: Response, next: Function) => {
  const session = (req as any).session;
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = await User.findById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  // Allow 'holder' role
  if (user.role !== 'holder') {
    return res.status(403).json({ error: 'Only holders can access this endpoint' });
  }
  
  (req as any).user = user;
  next();
};

/**
 * @route POST /api/user/request-document
 * @desc User requests a document/credential from an issuer
 * @access Holder only
 */
router.post('/request-document', validateSession, requireHolderRole, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { documentType, issuerName, reason, details } = req.body;

    if (!documentType || !issuerName) {
      return res.status(400).json({ error: 'documentType and issuerName are required' });
    }

    console.log('Creating document request with issuerName:', issuerName, 'Type:', typeof issuerName);

    const request = new CredentialRequest({
      userId: user._id,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      issuerName,
      documentType,
      reason: reason || 'Need this document',
      details: details || {},
      status: 'pending',
    });

    await request.save();
    
    console.log('Document request created and saved:', {
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      issuerName: request.issuerName,
      documentType: request.documentType,
      requestId: request._id
    });

    res.status(201).json({
      success: true,
      message: 'Document request sent to issuer',
      request: {
        id: request._id,
        documentType: request.documentType,
        issuerName: request.issuerName,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating document request:', error);
    res.status(500).json({ error: 'Failed to create document request' });
  }
});

/**
 * @route GET /api/user/my-requests
 * @desc Get all document requests made by the user
 * @access Holder only
 */
router.get('/my-requests', validateSession, requireHolderRole, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const requests = await CredentialRequest.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ requests });
  } catch (error: any) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * @route GET /api/user/my-credentials
 * @desc Get all credentials owned by the user
 * @access Holder only
 */
router.get('/my-credentials', validateSession, requireHolderRole, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only fetch credentials that belong to this user
    const credentials = await Credential.find({
      subjectId: user._id,
      status: 'ACTIVE',
    })
      .sort({ issuedAt: -1 })
      .populate('issuerId', 'firstName lastName email')
      .lean();

    console.log(`Fetched ${credentials.length} credentials for user ${user.email}`);

    res.json({ credentials });
  } catch (error: any) {
    console.error('Error fetching user credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

/**
 * @route POST /api/user/share-credential
 * @desc Share a credential with a verifier (generate shareable data for QR code)
 * @access Holder only
 */
router.post('/share-credential', validateSession, requireHolderRole, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { credentialId, verifierEmail } = req.body;

    if (!credentialId) {
      return res.status(400).json({ error: 'credentialId is required' });
    }

    const credential = await Credential.findOne({
      credentialId,
      subjectId: user._id,
    });

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found or not owned by you' });
    }

    // Create shareable data (this would be encoded in QR code)
    const shareData = {
      credentialId: credential.credentialId,
      holderDid: credential.subjectDid,
      holderEmail: user.email,
      credentialType: credential.credentialData.type,
      sharedAt: new Date().toISOString(),
      verifierEmail: verifierEmail || null,
    };

    console.log('Credential shared:', shareData);

    res.json({
      success: true,
      shareData,
      message: 'Credential share data generated',
    });
  } catch (error: any) {
    console.error('Error sharing credential:', error);
    res.status(500).json({ error: 'Failed to share credential' });
  }
});

export default router;
