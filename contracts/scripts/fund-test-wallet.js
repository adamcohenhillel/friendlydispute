const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // The wallet address to fund - replace this with your wallet address
  const walletToFund = "0xa1C50763c2C0492E35AAbAA459160E4694018d8d";
  // const walletToFund = "0x09D3A8C1250D12E00591660FcD237bc69b7ea1CB";

  console.log(`Funding ${walletToFund} with 10 ETH from ${signer.address}...`);
  
  const tx = await signer.sendTransaction({
    to: walletToFund,
    value: hre.ethers.parseEther("10.0")
  });

  console.log("Waiting for transaction to be mined...");
  await tx.wait();
  
  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Successfully funded wallet with 10 ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 