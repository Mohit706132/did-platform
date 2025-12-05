import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { getIssuerKeys } from "./issuerKey";
import type { VerifiableCredential, Proof } from "shared";
import { ISSUER_DID } from "./config"; // Fix Bug #16: Centralized config
import { logger } from "./utils/logger"; // Fix Bug #20: Error logging
import { auditLogger } from "./utils/auditLog"; // Fix Bug #19: Audit logging

const CREDENTIAL_CONTEXT = "https://www.w3.org/2018/credentials/v1";


export interface IssueCredentialRequest {
  subjectDid: string;
  claims: Record<string, any>;
  expirationDate?: string; // ISO
  type?: string[];         // additional types
  metadata?: Record<string, any>; // Bug #23: Add metadata support
}

export async function issueCredential(
  req: IssueCredentialRequest
): Promise<VerifiableCredential> {
  const { subjectDid, claims, expirationDate, type, metadata = {} } = req;
  const now = new Date();
  const issuanceDate = now.toISOString();

  const credentialId = `urn:uuid:${randomUUID()}`;

  // Bug #23: Include metadata in credential structure
  const vcData: any = {
    "@context": [CREDENTIAL_CONTEXT],
    id: credentialId,
    type: ["VerifiableCredential", ...(type ?? ["BasicProfileCredential"])],
    issuer: ISSUER_DID,
    issuanceDate,
    credentialSubject: {
      id: subjectDid,
      ...claims
    }
  };

  if (expirationDate) {
    vcData.expirationDate = expirationDate;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    vcData.metadata = {
      purpose: metadata.purpose || "general",
      credentialType: metadata.credentialType || "VerifiableCredential",
      tags: metadata.tags || [],
      customData: metadata.customData || {},
      createdAt: issuanceDate,
      issuedBy: ISSUER_DID,
    };
  }

  const vc: VerifiableCredential = vcData;

  const { privateKey, publicKeyJwk, kid } = await getIssuerKeys();

  const payload = {
    vc,
    iss: ISSUER_DID,
    sub: subjectDid,
    nbf: Math.floor(now.getTime() / 1000)
  };

  const jws = await new SignJWT(payload)
    .setProtectedHeader({
      alg: "ES256",
      kid
    })
    .setIssuedAt()
    .setIssuer(ISSUER_DID)
    .setSubject(subjectDid)
    .sign(privateKey);

  // Bug #20: Log successful issuance with context
  logger.info(`Credential issued successfully`, {
    credentialId,
    issuer: ISSUER_DID,
    subject: subjectDid,
    purpose: metadata.purpose || "general",
  });

  // Bug #19: Audit logging for credential issuance
  auditLogger.logIssueCredential(
    subjectDid,
    credentialId,
    {
      purpose: metadata.purpose,
      type: type,
      expirationDate,
    }
  );

  const proof: Proof = {
    type: "JsonWebSignature2020",
    created: issuanceDate,
    verificationMethod: `${ISSUER_DID}#${kid}`,
    proofPurpose: "assertionMethod",
    jws
  };

  vc.proof = proof;
  return vc;
}
