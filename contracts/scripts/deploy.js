const hre = require("hardhat");

async function main() {
  const DisputeEscrow = await hre.ethers.getContractFactory("DisputeEscrow");
  const disputeEscrow = await DisputeEscrow.deploy();

  await disputeEscrow.waitForDeployment();

  console.log(
    `DisputeEscrow deployed to ${await disputeEscrow.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 