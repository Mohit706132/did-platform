const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [user] = await hre.ethers.getSigners();
  console.log("Using user:", user.address);

  // Deploy the DIDRegistry contract
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const registry = await DIDRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("DIDRegistry deployed at:", registryAddress);

  // Save the contract address to a file that both frontend and backend can use
  const addressData = {
    registryAddress: registryAddress,
    deployedAt: new Date().toISOString(),
    network: "localhost",
    chainId: 31337
  };

  // Save to backend config
  const backendPath = path.join(__dirname, "../..", "backend", "contract-addresses.json");
  fs.writeFileSync(backendPath, JSON.stringify(addressData, null, 2));
  console.log("✅ Contract address saved to backend");

  // Save to frontend config
  const frontendPath = path.join(__dirname, "../..", "frontend", "contract-addresses.json");
  fs.writeFileSync(frontendPath, JSON.stringify(addressData, null, 2));
  console.log("✅ Contract address saved to frontend");

  const uri = "https://example.com/did/" + user.address;
  const tx = await registry.connect(user).registerDID(uri);
  await tx.wait();
  console.log("DID registered with URI:", uri);

  const res = await registry.resolveDID(user.address);
  console.log("Resolved DID Document URI:", res.didDocumentURI);
  console.log("Controller:", res.controller);
  console.log("Exists:", res.exists);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
