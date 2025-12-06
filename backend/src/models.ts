// backend/src/models.ts
import mongoose, { Schema, Document } from 'mongoose';

// ===== USER SCHEMA =====
interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  firstName: string;
  lastName: string;
  role: 'holder' | 'issuer' | 'verifier';
  createdAt: Date;
  verifiedAt?: Date;
  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, enum: ['holder', 'issuer', 'verifier'], default: 'holder' },
    verifiedAt: Date,
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
export const User = mongoose.model<IUser>('User', userSchema);

// ===== USER WALLET SCHEMA =====
interface IUserWallet extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  walletAddress: string;
  did: string;
  isVerified: boolean;
  verificationSignature: string;
  createdAt: Date;
  linkedAt: Date;
}

const userWalletSchema = new Schema<IUserWallet>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    walletAddress: { type: String, required: true, unique: true, lowercase: true },
    did: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    verificationSignature: String,
    linkedAt: Date,
  },
  { timestamps: true }
);

userWalletSchema.index({ userId: 1 });
userWalletSchema.index({ walletAddress: 1 }, { unique: true });
userWalletSchema.index({ did: 1 }, { unique: true });
export const UserWallet = mongoose.model<IUserWallet>('UserWallet', userWalletSchema);

// ===== SESSION SCHEMA =====
interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  walletAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
  isValid: boolean;
}

const sessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    walletAddress: String,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    lastActivity: { type: Date, default: Date.now },
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sessionSchema.index({ sessionId: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
export const Session = mongoose.model<ISession>('Session', sessionSchema);

// ===== WALLET CHALLENGE SCHEMA =====
interface IWalletChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  challengeId: string;
  walletAddress: string;
  message: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const walletChallengeSchema = new Schema<IWalletChallenge>(
  {
    challengeId: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true, lowercase: true },
    message: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

walletChallengeSchema.index({ challengeId: 1 }, { unique: true });
export const WalletChallenge = mongoose.model<IWalletChallenge>(
  'WalletChallenge',
  walletChallengeSchema
);

// ===== ISSUER REGISTRY SCHEMA =====
interface IIssuerRegistry extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  issuerDid: string;
  organizationName: string;
  organizationType: string;
  country: string;
  authorizedCredentialTypes: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocument?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  publicKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const issuerRegistrySchema = new Schema<IIssuerRegistry>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    issuerDid: { type: String, required: true, unique: true },
    organizationName: { type: String, required: true },
    organizationType: { type: String, required: true },
    country: { type: String, required: true },
    authorizedCredentialTypes: [{ type: String }],
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationDocument: String,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    publicKey: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

issuerRegistrySchema.index({ userId: 1 }, { unique: true });
issuerRegistrySchema.index({ issuerDid: 1 }, { unique: true });
issuerRegistrySchema.index({ verificationStatus: 1 });
export const IssuerRegistry = mongoose.model<IIssuerRegistry>(
  'IssuerRegistry',
  issuerRegistrySchema
);

// ===== CREDENTIAL SCHEMA =====
interface ICredential extends Document {
  _id: mongoose.Types.ObjectId;
  credentialId: string;
  issuerId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  subjectDid: string;
  credentialData: any;
  status: 'ACTIVE' | 'USED' | 'REVOKED';
  usageCount: number;
  maxUsages: number;
  issuedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const credentialSchema = new Schema<ICredential>(
  {
    credentialId: { type: String, required: true, unique: true },
    issuerId: { type: Schema.Types.ObjectId, ref: 'User' },
    subjectId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    subjectDid: { type: String, required: true },
    credentialData: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['ACTIVE', 'USED', 'REVOKED'], default: 'ACTIVE' },
    usageCount: { type: Number, default: 0 },
    maxUsages: { type: Number, default: 1 },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: true }
);

credentialSchema.index({ credentialId: 1 }, { unique: true });
credentialSchema.index({ subjectId: 1 });
credentialSchema.index({ status: 1 });
credentialSchema.index({ issuerId: 1 });
export const Credential = mongoose.model<ICredential>('Credential', credentialSchema);

// ===== CREDENTIAL USAGE LOG SCHEMA =====
interface ICredentialUsageLog extends Document {
  _id: mongoose.Types.ObjectId;
  credentialId: string;
  presenterId: string;
  verifierId?: string;
  result: 'SUCCESS' | 'FAILED';
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
}

const credentialUsageLogSchema = new Schema<ICredentialUsageLog>(
  {
    credentialId: { type: String, required: true },
    presenterId: { type: String, required: true },
    verifierId: String,
    result: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    reason: String,
    ipAddress: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

credentialUsageLogSchema.index({ credentialId: 1 });
credentialUsageLogSchema.index({ timestamp: 1 });
credentialUsageLogSchema.index({ presenterId: 1 });
export const CredentialUsageLog = mongoose.model<ICredentialUsageLog>(
  'CredentialUsageLog',
  credentialUsageLogSchema
);

// ===== CREDENTIAL REVOCATION SCHEMA =====
interface ICredentialRevocation extends Document {
  _id: mongoose.Types.ObjectId;
  credentialId: string;
  revokedBy: mongoose.Types.ObjectId;
  reason: string;
  revokedAt: Date;
  onChainTxHash?: string;
}

const credentialRevocationSchema = new Schema<ICredentialRevocation>(
  {
    credentialId: { type: String, required: true, unique: true },
    revokedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    reason: { type: String, required: true },
    onChainTxHash: String,
    revokedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

credentialRevocationSchema.index({ credentialId: 1 }, { unique: true });
export const CredentialRevocation = mongoose.model<ICredentialRevocation>(
  'CredentialRevocation',
  credentialRevocationSchema
);

// ===== VERIFICATION REQUEST SCHEMA =====
interface IVerificationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  requestId: string;
  verifierId: mongoose.Types.ObjectId;
  verifierDid: string;
  holderId?: mongoose.Types.ObjectId;
  holderDid?: string;
  requestedCredentialTypes: string[];
  requestedFields?: Record<string, string[]>;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  sharedCredentials?: any[];
  responseAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<IVerificationRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    verifierId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    verifierDid: { type: String, required: true },
    holderId: { type: Schema.Types.ObjectId, ref: 'User' },
    holderDid: String,
    requestedCredentialTypes: [{ type: String, required: true }],
    requestedFields: { type: Schema.Types.Mixed },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    sharedCredentials: [{ type: Schema.Types.Mixed }],
    responseAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

verificationRequestSchema.index({ requestId: 1 }, { unique: true });
verificationRequestSchema.index({ verifierId: 1 });
verificationRequestSchema.index({ holderId: 1 });
verificationRequestSchema.index({ status: 1 });
verificationRequestSchema.index({ expiresAt: 1 });
export const VerificationRequest = mongoose.model<IVerificationRequest>(
  'VerificationRequest',
  verificationRequestSchema
);

// ===== CREDENTIAL REQUEST SCHEMA (Holder requests credential from Issuer) =====
interface ICredentialRequest extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // User requesting the credential
  userEmail: string;
  userName: string;
  issuerName: string; // Name of issuing authority (e.g., "UIDAI", "RTO Maharashtra")
  documentType: string; // Type of document (e.g., "aadhar", "pan", "dl")
  reason: string; // Why the user needs this document
  status: 'pending' | 'approved' | 'rejected';
  details: any; // Additional details provided by user
  rejectionReason?: string;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  credentialId?: string; // ID of issued credential if approved
  createdAt: Date;
}

const credentialRequestSchema = new Schema<ICredentialRequest>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    issuerName: { type: String, required: true },
    documentType: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    details: { type: Schema.Types.Mixed },
    rejectionReason: String,
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    credentialId: String,
  },
  { timestamps: true }
);

credentialRequestSchema.index({ userId: 1 });
credentialRequestSchema.index({ issuerName: 1 });
credentialRequestSchema.index({ status: 1 });
credentialRequestSchema.index({ documentType: 1 });
export const CredentialRequest = mongoose.model<ICredentialRequest>(
  'CredentialRequest',
  credentialRequestSchema
);

// Export types
export type {
  IUser,
  IUserWallet,
  ISession,
  IWalletChallenge,
  IIssuerRegistry,
  ICredential,
  ICredentialUsageLog,
  ICredentialRevocation,
  IVerificationRequest,
  ICredentialRequest,
};
