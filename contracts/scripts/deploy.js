const hre = require("hardhat");

async function main() {
  // For local testing, we'll deploy a mock LINK token and Oracle
  const LinkToken = await hre.ethers.getContractFactory("LinkToken");
  const linkToken = await LinkToken.deploy();
  await linkToken.waitForDeployment();
  console.log(`LinkToken deployed to ${await linkToken.getAddress()}`);

  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy(await linkToken.getAddress());
  await oracle.waitForDeployment();
  console.log(`Oracle deployed to ${await oracle.getAddress()}`);

  // Deploy the DisputeEscrow contract
  const DisputeEscrow = await hre.ethers.getContractFactory("DisputeEscrow");
  const disputeEscrow = await DisputeEscrow.deploy(
    await linkToken.getAddress(),
    await oracle.getAddress(),
    "0x" + "00".repeat(32) // Mock jobId for local testing
  );

  await disputeEscrow.waitForDeployment();
  console.log(`DisputeEscrow deployed to ${await disputeEscrow.getAddress()}`);

  // Fund the contract with LINK tokens
  const amount = hre.ethers.parseUnits("1", 18); // 1 LINK
  await linkToken.transfer(await disputeEscrow.getAddress(), amount);
  console.log(`Funded DisputeEscrow with ${hre.ethers.formatUnits(amount, 18)} LINK`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 