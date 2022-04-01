// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main(governance = process.env.GOVERNANCE, silent = false) {
  const HackedFirst = await hre.ethers.getContractFactory("HackedFirst");
  const HackedFirstFactory = await hre.ethers.getContractFactory(
    "HackedFirstFactory"
  );
  const hackedFirstImplementation = await HackedFirst.deploy();
  await hackedFirstImplementation.deployed();
  const hackedFirstFactory = await HackedFirstFactory.deploy(
    hackedFirstImplementation.address,
    governance
  );
  await hackedFirstFactory.deployed();

  if (!silent) {
    console.log("HackedFirstFactory deployed to:", hackedFirstFactory.address);
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
