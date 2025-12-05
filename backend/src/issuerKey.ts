import { generateKeyPair, exportJWK, importPKCS8, type JWK, type KeyLike } from "jose";
import { ISSUER_DID, ISSUER_PRIVATE_KEY } from "./config";
import { logger } from "./utils/logger";

interface IssuerKeys {
  privateKey: KeyLike;
  publicKeyJwk: JWK;
  kid: string;
}

// Cache the issuer's keys for the lifetime of the process
let cachedKeys: IssuerKeys | null = null;

export async function getIssuerKeys(): Promise<IssuerKeys> {
  if (cachedKeys) {
    return cachedKeys;
  }

  let privateKey: KeyLike;
  let publicKeyJwk: JWK;

  if (ISSUER_PRIVATE_KEY) {
    try {
      // If a private key is configured, use it (should be in PKCS8 PEM format)
      // For demo purposes with the hex key from .env, generate ES256 pair instead
      if (ISSUER_PRIVATE_KEY.startsWith("0x")) {
        // This is an Ethereum-style key, generate ES256 pair for JWT signing
        logger.info("Generating ES256 key pair for JWT signing (Ethereum key found but incompatible format)");
        const { publicKey, privateKey: privKey } = await generateKeyPair("ES256");
        privateKey = privKey;
        publicKeyJwk = await exportJWK(publicKey);
      } else {
        // Assume PEM format
        privateKey = await importPKCS8(ISSUER_PRIVATE_KEY, "ES256");
        publicKeyJwk = await exportJWK(privateKey);
      }
    } catch (err) {
      logger.error("Failed to import issuer private key, generating new pair", "issuerKey.ts", err as Error);
      const { publicKey, privateKey: privKey } = await generateKeyPair("ES256");
      privateKey = privKey;
      publicKeyJwk = await exportJWK(publicKey);
    }
  } else {
    // Generate an ES256 key pair (P-256 curve) for JWT signing
    logger.warn("No ISSUER_PRIVATE_KEY configured, generating ephemeral ES256 key pair");
    const { publicKey, privateKey: privKey } = await generateKeyPair("ES256");
    privateKey = privKey;
    publicKeyJwk = await exportJWK(publicKey);
  }

  // Set kid (key ID) - use issuer DID with a key identifier
  const kid = `${ISSUER_DID}#key-1`;

  cachedKeys = {
    privateKey,
    publicKeyJwk,
    kid
  };

  logger.info("Issuer keys loaded", { kid, issuer: ISSUER_DID });
  return cachedKeys;
}
