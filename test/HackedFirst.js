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

  it("Cannot initialize the master copy", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    await expect(
      this.hackedFirstImplementation.initialize(
        hacker.address,
        committee.address
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Deploy an instance", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];

    await expect(
      this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("Must have committee");

    const tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    expect(tx).to.emit("NewHackFirstContract").withArgs(instance.address);
    expect(await instance.hacker()).to.equal(hacker.address);
    expect(await instance.owner()).to.equal(hacker.address);
    expect(await instance.newOwner()).to.equal(committee.address);

    await expect(
      instance.initialize(hacker.address, committee.address)
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Change committee", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const newCommittee = this.accounts[4];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    await expect(
      instance.transferOwnership(newCommittee.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      instance.connect(committee).transferOwnership(newCommittee.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      instance
        .connect(hacker)
        .transferOwnership("0x0000000000000000000000000000000000000000")
    ).to.be.revertedWith("Ownable: new owner is the zero address");

    tx = await (
      await instance.connect(hacker).transferOwnership(committee.address)
    ).wait();
    expect(tx).to.emit("NewOwnerProposed").withArgs(committee.address);
    expect(await instance.newOwner()).to.equal(committee.address);
    await expect(instance.acceptOwnership()).to.be.revertedWith(
      "must be newOwner to accept ownership"
    );

    tx = await (await instance.connect(committee).acceptOwnership()).wait();
    expect(tx)
      .to.emit("OwnershipTransferred")
      .withArgs(hacker.address, committee.address);
    await expect(
      instance.connect(hacker).transferOwnership(committee.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Renounce ownership", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    await expect(instance.renounceOwnership()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    tx = await (
      await instance.connect(hacker).transferOwnership(committee.address)
    ).wait();
    expect(tx).to.emit("NewOwnerProposed").withArgs(committee.address);
    expect(await instance.newOwner()).to.equal(committee.address);

    tx = await (await instance.connect(committee).acceptOwnership()).wait();
    expect(tx)
      .to.emit("OwnershipTransferred")
      .withArgs(hacker.address, committee.address);
    expect(await instance.owner()).to.equal(committee.address);
    expect(await instance.newOwner()).to.equal(
      "0x0000000000000000000000000000000000000000"
    );

    tx = await (await instance.connect(committee).renounceOwnership()).wait();
    expect(tx)
      .to.emit("OwnershipTransferred")
      .withArgs(committee.address, hacker.address);
    expect(await instance.owner()).to.equal(hacker.address);
    expect(await instance.newOwner()).to.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("Retrieve funds (ETH)", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    await expect(
      instance.retrieveFunds(
        beneficiary.address,
        1000,
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await instance.connect(committee).acceptOwnership();

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          10,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          10001,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith(
      "panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("No ETH in the contract");

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });

    expect(await ethers.provider.getBalance(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );
    const initialBalanceHacker = await ethers.provider.getBalance(
      hacker.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          "0x0000000000000000000000000000000000000000",
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Cannot send to 0 address");

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        1000
      );
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("1"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(ethers.utils.parseEther("9"))
    );
  });

  it("Retrieve funds (ETH non to beneficiary)", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });

    expect(await ethers.provider.getBalance(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );
    const initialBalanceHacker = await ethers.provider.getBalance(
      hacker.address
    );

    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    await instance.connect(committee).acceptOwnership();

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          10000,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        10000
      );
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("10"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(ethers.utils.parseEther("0"))
    );
  });

  it("Retrieve funds (ETH) failed to send", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.hackedFirstFactory;

    const tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });

    await instance.connect(committee).acceptOwnership();

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Failed to send ETH");
  });

  it("Retrieve funds (ERC20)", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    await instance.connect(committee).acceptOwnership();
    await expect(
      instance.retrieveFunds(beneficiary.address, 1000, token.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 10, token.address)
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 11000, token.address)
    ).to.be.revertedWith(
      "panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 1000, token.address)
    ).to.be.revertedWith("No tokens in the contract");

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          "0x0000000000000000000000000000000000000000",
          1000,
          token.address
        )
    ).to.be.revertedWith("Cannot send to 0 address");

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 1000, token.address)
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(beneficiary.address, token.address, 1000);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("9")
    );
  });

  it("Retrieve funds (ERC20 non to beneficiary)", async function () {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy();
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[1].args._instance);
    await instance.connect(committee).acceptOwnership();

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 10000, token.address)
    ).wait();
    expect(tx).to.emit("FundsRetrieved").withArgs(token.address, 10000);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("10")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("0")
    );
  });
});
