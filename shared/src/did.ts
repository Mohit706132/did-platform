export type DID = string; // e.g. "did:mychain:0xabc..."

export interface DIDDocument {
  "@context"?: string | string[];
  id: DID;
  verificationMethod: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  service?: DIDService[];
}

export interface VerificationMethod {
  id: string; // e.g. "did:mychain:0xissuer#key-1"
  type: string; // e.g. "JsonWebKey2020"
  controller: DID;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
}

export interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string | string[];
}
