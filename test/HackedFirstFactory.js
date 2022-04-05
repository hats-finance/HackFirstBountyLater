const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFactory } = require("../scripts/deploy-factory.js");

describe("HackedFirstFactory", function () {
  before(async function () {
    this.HackedFirst = await ethers.getContractFactory("HackedFirst");
    this.accounts = await ethers.getSigners();
    this.hats = this.accounts[0];
    const deployResults = await deployFactory(this.hats.address, true);
    this.hackedFirstFactory = deployResults.hackedFirstFactory;
    this.hackedFirstImplementation = deployResults.hackedFirstImplementation;
  });

  it("Constructor", async function () {
    expect(await this.hackedFirstFactory.implementation()).to.equal(
      this.hackedFirstImplementation.address
    );
    expect(await this.hackedFirstFactory.hats()).to.equal(
      this.accounts[0].address
    );
  });

  it("Deploy an instance", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];
    const hats = this.hats;

    const tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    expect(tx)
      .to.emit("NewHackedFirstContract")
      .withArgs(
        instance.address,
        hacker.address,
        committee.address,
        beneficiary.address
      );
    expect(await instance.hacker()).to.equal(hacker.address);
    expect(await instance.committee()).to.equal(committee.address);
    expect(await instance.beneficiary()).to.equal(beneficiary.address);
    expect(await instance.hats()).to.equal(hats.address);
  });

  it("Deploy an instance without hacker specified", async function () {
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];
    const hats = this.hats;

    const tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        "0x0000000000000000000000000000000000000000",
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    expect(tx).to.emit("NewHackedFirstContract").withArgs(instance.address);
    expect(await instance.hacker()).to.equal(this.accounts[0].address);
    expect(await instance.committee()).to.equal(committee.address);
    expect(await instance.beneficiary()).to.equal(beneficiary.address);
    expect(await instance.hats()).to.equal(hats.address);
  });
});
