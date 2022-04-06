const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFactory } = require("../scripts/deploy-factory.js");

describe("HackFirstFactory", function () {
  before(async function () {
    this.HackFirst = await ethers.getContractFactory("HackFirst");
    this.accounts = await ethers.getSigners();
    const deployResults = await deployFactory(true);
    this.hackedFirstFactory = deployResults.hackedFirstFactory;
    this.hackedFirstImplementation = deployResults.hackedFirstImplementation;
  });

  it("Constructor", async function () {
    expect(await this.hackedFirstFactory.implementation()).to.equal(
      this.hackedFirstImplementation.address
    );
  });

  it("Deploy an instance", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];

    const tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    expect(tx)
      .to.emit("NewHackFirstContract")
      .withArgs(instance.address, hacker.address, committee.address);
    expect(await instance.hacker()).to.equal(hacker.address);
    expect(await instance.newOwner()).to.equal(committee.address);
  });

  it("Deploy an instance without hacker specified", async function () {
    const committee = this.accounts[2];

    const tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        "0x0000000000000000000000000000000000000000",
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    expect(tx).to.emit("NewHackFirstContract").withArgs(instance.address);
    expect(await instance.hacker()).to.equal(this.accounts[0].address);
    expect(await instance.newOwner()).to.equal(committee.address);
  });
});
