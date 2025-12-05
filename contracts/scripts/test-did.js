const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  console.log("Using user:", user.address);

  // Deploy the DIDRegistry contract
  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const registry = await DIDRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("DIDRegistry deployed at:", registryAddress);

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
