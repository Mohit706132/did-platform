import type { DID } from "./did";

export type URI = string;

export interface Proof {
  type: string;            // e.g. "JsonWebSignature2020"
  created: string;         // ISO timestmap
  verificationMethod: URI; // DID URL of the key
  proofPurpose: string;    // e.g. "assertionMethod"
  jws: string;             // compact JWS
}

export interface VerifiableCredential {
  "@context": (string | object)[];
  id: URI;
  type: string[]; // ["VerifiableCredential", "StudentIDCredential"]
  issuer: DID | URI;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id?: DID | URI;
    [key: string]: any;   // e.g. name, studentId, role, etc.
  };
  proof?: Proof;
}

export interface VerifiablePresentation {
  "@context": (string | object)[];
  type: string[]; // ["VerifiablePresentation"]
  holder?: DID | URI;
  verifiableCredential: VerifiableCredential[];
  proof?: Proof;
}
