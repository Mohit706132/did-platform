import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import { getIssuerKeys } from "./issuerKey";
import type { VerifiableCredential, Proof } from "shared";

const CREDENTIAL_CONTEXT = "https://www.w3.org/2018/credentials/v1";
const ISSUER_DID = process.env.ISSUER_DID || "did:mychain:issuer-demo-1";


export interface IssueCredentialRequest {
  subjectDid: string;
  claims: Record<string, any>;
  expirationDate?: string; // ISO
  type?: string[];         // additional types
}

export async function issueCredential(
  req: IssueCredentialRequest
): Promise<VerifiableCredential> {
  const { subjectDid, claims, expirationDate, type } = req;
  const now = new Date();
  const issuanceDate = now.toISOString();

  const credentialId = `urn:uuid:${randomUUID()}`;

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
