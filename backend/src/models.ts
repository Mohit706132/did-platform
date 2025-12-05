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
    verifiedAt: Date,
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
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

// Export types
export type {
  IUser,
  IUserWallet,
  ISession,
  IWalletChallenge,
  ICredential,
  ICredentialUsageLog,
  ICredentialRevocation,
};
