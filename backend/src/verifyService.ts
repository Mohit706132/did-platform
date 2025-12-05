// backend/src/verifyService.ts
import { importJWK, jwtVerify } from "jose";
import type { VerifiableCredential } from "shared";
import { getIssuerKeys } from "./issuerKey";
import { isCredentialRevoked } from "./didRegistryClient";
import { ISSUER_DID } from "./config"; // Fix Bug #16: Centralized config
import { logger } from "./utils/logger"; // Fix Bug #20: Error logging
import { validateCredentialDates } from "./utils/validation"; // Fix Bug #18: Date validation
import { auditLogger } from "./utils/auditLog"; // Fix Bug #19: Audit logging

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

export async function verifyCredential(
  vc: VerifiableCredential
): Promise<VerificationResult> {
  try {
    if (!vc.proof || !vc.proof.jws) {
      return { valid: false, reason: "Missing proof or JWS on credential" };
    }

    const jws = vc.proof.jws;
    const subjectDid = vc.credentialSubject?.id;

    if (!subjectDid) {
      return { valid: false, reason: "Credential subject id is missing" };
    }

    // Bug #18: Validate credential dates
    const dateValidation = validateCredentialDates(vc);
    if (!dateValidation.valid) {
      return { valid: false, reason: dateValidation.reason };
    }

    // Get issuer public key from our in-memory key store
    const { publicKeyJwk } = await getIssuerKeys();
    const publicKey = await importJWK(publicKeyJwk, "ES256");

    // Verify JWS
    const { payload } = await jwtVerify(jws, publicKey, {
      issuer: ISSUER_DID,
      subject: subjectDid
    });

    // We put the VC inside the JWT payload when issuing
    const payloadVc = (payload as any).vc;
    if (!payloadVc) {
      return { valid: false, reason: "No VC found inside JWS payload" };
    }

    // Minimal consistency checks between payload VC and provided VC
    if (payloadVc.id !== vc.id) {
      return { valid: false, reason: "Credential ID mismatch between proof and VC" };
    }
    if (payloadVc.issuer !== vc.issuer) {
      return { valid: false, reason: "Issuer mismatch between proof and VC" };
    }
    if (payloadVc.credentialSubject?.id !== subjectDid) {
      return { valid: false, reason: "Subject DID mismatch between proof and VC" };
    }

    // Check revocation status on-chain
    const revoked = await isCredentialRevoked(vc.id);
    if (revoked) {
      return { valid: false, reason: "Credential has been revoked on-chain" };
    }

    // Optional: check expiry if present
    if (vc.expirationDate) {
      const now = new Date();
      const exp = new Date(vc.expirationDate);
      if (now > exp) {
        return { valid: false, reason: "Credential is expired" };
      }
    }

    // Bug #20: Log successful verification
    logger.info(`Credential verified successfully`, {
      credentialId: vc.id,
      issuer: vc.issuer,
      subject: subjectDid,
    });

    // Bug #19: Audit logging for credential verification
    auditLogger.logVerifyCredential(vc.id, subjectDid, true);

    return { valid: true };
  } catch (err: any) {
    // Bug #20: Replace console.error with logger
    const errorId = logger.error(`Verification error`, undefined, err);
    // Bug #19: Audit logging for failed verification
    auditLogger.logVerifyCredential(vc?.id, undefined, false, err?.message);
    return { valid: false, reason: `Verification failed (${errorId})` };
  }
}

