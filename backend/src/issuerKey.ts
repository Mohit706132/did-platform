import { generateKeyPair, exportJWK, type JWK, type KeyLike } from "jose";

interface IssuerKeys {
  privateKey: KeyLike;
  publicKeyJwk: JWK;
  kid: string;
}

// In a real system, you'd persist this; for now, we generate once at startup.
let cachedKeys: IssuerKeys | null = null;

export async function getIssuerKeys(): Promise<IssuerKeys> {
  if (cachedKeys) {
    return cachedKeys;
  }

  // Generate an ES256 key pair (P-256 curve)
  const { publicKey, privateKey } = await generateKeyPair("ES256");

  const publicKeyJwk = await exportJWK(publicKey);
  // Set kid (key ID) as a simple unique string for demo
  const kid = `key-${Date.now()}`;

  cachedKeys = {
    privateKey,
    publicKeyJwk,
    kid
  };

  // `cachedKeys` is now guaranteed non-null
  return cachedKeys;
}
