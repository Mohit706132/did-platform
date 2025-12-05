const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const DIDRegistry = await hre.ethers.getContractFactory("DIDRegistry");
  const registry = await DIDRegistry.deploy();

  // ✅ ethers v6 style
  await registry.waitForDeployment();

  const addr = await registry.getAddress();
  console.log("DIDRegistry deployed to:", addr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
