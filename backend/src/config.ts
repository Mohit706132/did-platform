// backend/src/config.ts
/**
 * Centralized configuration for issuer and system settings
 * Fixes Bug #16: Hardcoded issuer DID duplication
 */

export const ISSUER_DID = process.env.ISSUER_DID || "did:mychain:issuer-demo-1";
export const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;

export const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
export const DID_REGISTRY_ADDRESS = process.env.DID_REGISTRY_ADDRESS;

export const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || "development";

// Validation
if (!DID_REGISTRY_ADDRESS) {
  throw new Error("DID_REGISTRY_ADDRESS is required in .env");
}

export const CONFIG = {
  issuer: {
    did: ISSUER_DID,
    privateKey: ISSUER_PRIVATE_KEY
  },
  blockchain: {
    rpcUrl: RPC_URL,
    registryAddress: DID_REGISTRY_ADDRESS
  },
  server: {
    port: BACKEND_PORT,
    env: NODE_ENV
  }
};
