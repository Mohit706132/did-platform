import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { getIssuerKeys } from "./issuerKey";
import type { VerifiableCredential, Proof } from "shared";
import { ISSUER_DID } from "./config"; // Fix Bug #16: Centralized config
import { logger } from "./utils/logger"; // Fix Bug #20: Error logging

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
  const vc: VerifiableCredential = {
    "@context": [CREDENTIAL_CONTEXT],
    id: credentialId,
    type: ["VerifiableCredential", ...(type ?? ["BasicProfileCredential"])],
    issuer: ISSUER_DID,
    issuanceDate,
    ...(expirationDate ? { expirationDate } : {}),
    credentialSubject: {
      id: subjectDid,
      ...claims
    },
    metadata: {
      purpose: metadata.purpose || "general",
      credentialType: metadata.credentialType || "VerifiableCredential",
      tags: metadata.tags || [],
      customData: metadata.customData || {},
      createdAt: issuanceDate,
      issuedBy: ISSUER_DID,
    }
  };

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
