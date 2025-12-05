// src/blockchain/didRegistry.ts
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Minimal ABI for our DIDRegistry contract
const DID_REGISTRY_ABI = [
  "function registerDID(string didDocumentURI) external",
  "function updateDID(string didDocumentURI) external",
  "function resolveDID(address subject) external view returns (string didDocumentURI, address controller, bool exists)"
];

type NetworkConfig = {
  chainId: number;
  name: string;
  registryAddress: string;
};

// Map of supported networks → their registry addresses
const NETWORKS: NetworkConfig[] = [
  {
    chainId: 31337, // Hardhat local node
    name: "Hardhat Localhost",
    registryAddress: import.meta.env.VITE_DID_REGISTRY_ADDRESS_LOCAL || ""
  },
  {
    chainId: 11155111, // Sepolia (optional)
    name: "Sepolia Testnet",
    registryAddress: import.meta.env.VITE_DID_REGISTRY_ADDRESS_SEPOLIA || ""
  }
  // Add more networks here if needed
];

function getNetworkConfig(chainId: number): NetworkConfig {
  const cfg = NETWORKS.find((n) => n.chainId === chainId);
  if (!cfg) {
    throw new Error(`Unsupported network with chainId ${chainId}. Please configure it in NETWORKS.`);
  }
  if (!cfg.registryAddress || !ethers.isAddress(cfg.registryAddress)) {
    throw new Error(
      `No valid DIDRegistry address configured for network "${cfg.name}". ` +
        `Check your .env (e.g. VITE_DID_REGISTRY_ADDRESS_LOCAL).`
    );
  }
  return cfg;
}

export async function getProvider(): Promise<ethers.BrowserProvider> {
  if (!window.ethereum) {
    throw new Error("No injected provider found. Install MetaMask.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider;
}

export async function getSigner(): Promise<ethers.Signer> {
  const provider = await getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner(accounts[0]);
  return signer;
}

export async function getCurrentAddress(): Promise<string> {
  const provider = await getProvider();
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

/**
 * Returns a DIDRegistry contract instance bound to the current network,
 * plus the resolved registry address.
 */
async function getRegistryWithSigner(): Promise<{
  contract: ethers.Contract;
  address: string;
  networkName: string;
}> {
  const signer = await getSigner();
  const network = await signer.provider!.getNetwork();
  const chainId = Number(network.chainId); // ethers v6: chainId is bigint

  const cfg = getNetworkConfig(chainId);

  const contract = new ethers.Contract(cfg.registryAddress, DID_REGISTRY_ABI, signer);
  return {
    contract,
    address: cfg.registryAddress,
    networkName: cfg.name
  };
}

async function getRegistryReadOnly(): Promise<{
  contract: ethers.Contract;
  address: string;
  networkName: string;
}> {
  const provider = await getProvider();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const cfg = getNetworkConfig(chainId);

  const contract = new ethers.Contract(cfg.registryAddress, DID_REGISTRY_ABI, provider);
  return {
    contract,
    address: cfg.registryAddress,
    networkName: cfg.name
  };
}

/**
 * Registers a DID document URI on-chain for the connected account.
 */
export async function registerDidOnChain(didDocumentURI: string): Promise<void> {
  const { contract, networkName } = await getRegistryWithSigner();

  console.log(`Using DIDRegistry on network "${networkName}" to register DID...`);

  const tx = await contract.registerDID(didDocumentURI);
  await tx.wait();
}

/**
 * Resolves the DID record for a given address on the current network.
 */
export async function resolveDid(address: string): Promise<{
  didDocumentURI: string;
  controller: string;
  exists: boolean;
  registryAddress: string;
  networkName: string;
}> {
  const { contract, address: registryAddress, networkName } = await getRegistryReadOnly();

  const [uri, controller, exists] = await contract.resolveDID(address);

  return {
    didDocumentURI: uri,
    controller,
    exists,
    registryAddress,
    networkName
  };
}
