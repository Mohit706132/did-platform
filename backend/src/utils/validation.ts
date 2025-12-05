// backend/src/utils/validation.ts
/**
 * Input validation utilities
 * Fixes Bug #13: No input validation
 * Fixes Bug #17: No Content-Type validation
 */

import type { VerifiableCredential } from "shared";

/**
 * Validates credential structure
 * Ensures credential has all required fields
 */
export function validateCredentialStructure(vc: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const required = ["@context", "id", "type", "issuer", "credentialSubject", "proof"];

  if (typeof vc !== "object" || vc === null) {
    return { valid: false, errors: ["Credential must be an object"] };
  }

  for (const field of required) {
    if (!(field in vc)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate types
  if (!Array.isArray(vc["@context"])) {
    errors.push("@context must be an array");
  }

  if (typeof vc.issuer !== "string") {
    errors.push("issuer must be a string (DID)");
  }

  if (typeof vc.credentialSubject !== "object" || !vc.credentialSubject.id) {
    errors.push("credentialSubject must have an id field");
  }

  if (typeof vc.proof !== "object" || !vc.proof.jws) {
    errors.push("proof must have a jws field");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates request body for issue endpoint
 */
export function validateIssueRequest(body: any): {
  valid: boolean;
  errors: string[];
  data?: { subjectDid: string; claims: any; expirationDate?: string; type?: string[]; metadata?: Record<string, any> };
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const { subjectDid, claims, expirationDate, type, metadata } = body;

  if (!subjectDid || typeof subjectDid !== "string") {
    errors.push("subjectDid must be a non-empty string");
  }

  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    errors.push("claims must be a non-empty object");
  }

  if (expirationDate && typeof expirationDate !== "string") {
    errors.push("expirationDate must be a string (ISO format)");
  }

  if (type && !Array.isArray(type)) {
    errors.push("type must be an array of strings");
  }

  // Bug #23: Validate metadata if provided
  if (metadata && typeof metadata !== "object") {
    errors.push("metadata must be an object");
  }

  return {
    valid: errors.length === 0,
    errors,
    data:
      errors.length === 0
        ? { subjectDid, claims, expirationDate, type, metadata }
        : undefined
  };
}

/**
 * Validates revoke request
 */
export function validateRevokeRequest(body: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const { credentialId } = body;

  if (!credentialId || typeof credentialId !== "string") {
    errors.push("credentialId must be a non-empty string");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates dates
 * Fixes Bug #18: No issuanceDate validation
 */
export function validateCredentialDates(vc: any): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();

  // Check issuanceDate is not in future
  if (vc.issuanceDate) {
    const issuedDate = new Date(vc.issuanceDate);
    if (isNaN(issuedDate.getTime())) {
      return { valid: false, reason: "Invalid issuanceDate format" };
    }
    if (now < issuedDate) {
      return { valid: false, reason: "Credential is not yet valid (future issuance date)" };
    }
  }

  // Check credential is not expired
  if (vc.expirationDate) {
    const expDate = new Date(vc.expirationDate);
    if (isNaN(expDate.getTime())) {
      return { valid: false, reason: "Invalid expirationDate format" };
    }
    if (now > expDate) {
      return { valid: false, reason: "Credential has expired" };
    }
  }

  return { valid: true };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * Requirements: at least 8 characters, contains uppercase, lowercase, number, and special character
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
