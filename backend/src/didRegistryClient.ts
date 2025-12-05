// backend/src/didRegistryClient.ts
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DID_REGISTRY_ADDRESS =
  process.env.DID_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000"; //your address here

const DID_REGISTRY_ABI = [
  "function isCredentialRevoked(bytes32 credentialIdHash) external view returns (bool)",
  "function setCredentialStatus(bytes32 credentialIdHash, bool revoked) external"
];

let provider: ethers.JsonRpcProvider | null = null;
let registryContract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

function getRegistry(signer?: ethers.Signer): ethers.Contract {
  const p = signer ?? getProvider();
  if (!registryContract || signer) {
    return new ethers.Contract(DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, p);
  }
  return registryContract;
}

export async function isCredentialRevoked(credentialId: string): Promise<boolean> {
  const registry = getRegistry();
  const hash = ethers.id(credentialId);
  const revoked: boolean = await registry.isCredentialRevoked(hash);
  return revoked;
}

// Very simple admin revocation using the first Hardhat account as issuer/admin
export async function revokeCredential(credentialId: string): Promise<void> {
  const p = getProvider();
  const [admin] = await p.listAccounts();
  const signer = new ethers.Wallet(
    // WARNING: for demo only – in real life, never hardcode a private key
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    p
  );

  const registry = getRegistry(signer);
  const hash = ethers.id(credentialId);
  const tx = await registry.setCredentialStatus(hash, true);
  await tx.wait();
}
