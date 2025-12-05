// backend/src/verifyService.ts
import { importJWK, jwtVerify } from "jose";
import type { VerifiableCredential } from "shared";
import { getIssuerKeys } from "./issuerKey";
import { isCredentialRevoked } from "./didRegistryClient";

const ISSUER_DID = "did:mychain:issuer-demo-1";

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

    return { valid: true };
  } catch (err: any) {
    console.error("Verification error:", err);
    return { valid: false, reason: err?.message ?? "Unknown verification error" };
  }
}
