// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main(silent = false) {
  const HackFirst = await hre.ethers.getContractFactory("HackFirst");
  const HackFirstFactory = await hre.ethers.getContractFactory(
    "HackFirstFactory"
  );
  const hackedFirstImplementation = await HackFirst.deploy();
  await hackedFirstImplementation.deployed();
  const hackedFirstFactory = await HackFirstFactory.deploy(
    hackedFirstImplementation.address
  );
  await hackedFirstFactory.deployed();

  if (!silent) {
    console.log("HackFirstFactory deployed to:", hackedFirstFactory.address);
  }
  return { hackedFirstFactory, hackedFirstImplementation };
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { deployFactory: main };
