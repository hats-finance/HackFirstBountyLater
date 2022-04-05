const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFactory } = require("../scripts/deploy-factory.js");

describe("HackFirstFactory", function () {
  before(async function () {
    this.HackFirst = await ethers.getContractFactory("HackFirst");
    this.accounts = await ethers.getSigners();
    this.hats = this.accounts[0];
    const deployResults = await deployFactory(this.hats.address, true);
    this.hackedFirstFactory = deployResults.hackedFirstFactory;
    this.hackedFirstImplementation = deployResults.hackedFirstImplementation;
  });

  it("Cannot initialize the master copy", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const hats = this.hats;
    await expect(
      this.hackedFirstImplementation.initialize(
        hacker.address,
        committee.address,
        hats.address
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Deploy an instance", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const hats = this.hats;

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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);
    expect(tx).to.emit("NewHackFirstContract").withArgs(instance.address);
    expect(await instance.hacker()).to.equal(hacker.address);
    expect(await instance.committee()).to.equal(committee.address);
    expect(await instance.hats()).to.equal(hats.address);

    await expect(
      instance.initialize(hacker.address, committee.address, hats.address)
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.changeCommittee(newCommittee.address)
    ).to.be.revertedWith("Only committee");

    tx = await (
      await instance.connect(committee).changeCommittee(newCommittee.address)
    ).wait();
    expect(tx).to.emit("CommitteeChanged").withArgs(newCommittee.address);
    expect(await instance.committee()).to.equal(newCommittee.address);
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.retrieveFunds(
        beneficiary.address,
        1000,
        0,
        0,
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("Only committee");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          10,
          0,
          0,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          2000,
          4000,
          5000,
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
          0,
          0,
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
    const initialBalanceCommittee = await ethers.provider.getBalance(
      committee.address
    );
    const initialBalanceGovernance = await ethers.provider.getBalance(
      this.hats.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          200,
          100,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        1000,
        200,
        100
      );
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("1"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee.add(
        ethers.utils
          .parseEther("0.2")
          .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
      )
    );
    expect(await ethers.provider.getBalance(this.hats.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("0.1"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(ethers.utils.parseEther("8.7"))
    );
  });

  it("Retrieve funds (ETH no tips)", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackFirstContract(
        hacker.address,
        committee.address
      )
    ).wait();
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          "0x0000000000000000000000000000000000000000",
          1000,
          100,
          0,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Cannot send to 0 address");

    expect(await ethers.provider.getBalance(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );
    const initialBalanceHacker = await ethers.provider.getBalance(
      hacker.address
    );
    const initialBalanceCommittee = await ethers.provider.getBalance(
      committee.address
    );
    const initialBalanceGovernance = await ethers.provider.getBalance(
      this.hats.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          2000,
          0,
          0,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        1000,
        200,
        100
      );
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("2"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee
        .add(ethers.utils.parseEther("0"))
        .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
    );
    expect(await ethers.provider.getBalance(this.hats.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("0"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(ethers.utils.parseEther("8"))
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);

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
    const initialBalanceCommittee = await ethers.provider.getBalance(
      committee.address
    );
    const initialBalanceGovernance = await ethers.provider.getBalance(
      this.hats.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          8000,
          1000,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(
        beneficiary.address,
        "0x0000000000000000000000000000000000000000",
        8000,
        1000,
        1000
      );
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("8"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee.add(
        ethers.utils
          .parseEther("1")
          .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
      )
    );
    expect(await ethers.provider.getBalance(this.hats.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("1"))
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });
    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          beneficiary.address,
          1000,
          100,
          0,
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.retrieveFunds(beneficiary.address, 1000, 0, 0, token.address)
    ).to.be.revertedWith("Only committee");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 10, 0, 0, token.address)
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 2000, 4000, 5000, token.address)
    ).to.be.revertedWith(
      "panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 1000, 0, 0, token.address)
    ).to.be.revertedWith("No tokens in the contract");

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 1000, 200, 100, token.address)
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(beneficiary.address, token.address, 1000, 200, 100);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await token.balanceOf(committee.address)).to.equal(
      ethers.utils.parseEther("0.2")
    );
    expect(await token.balanceOf(this.hats.address)).to.equal(
      ethers.utils.parseEther("0.1")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("8.7")
    );
  });

  it("Retrieve funds (ERC20 no tips)", async function () {
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    await expect(
      instance
        .connect(committee)
        .retrieveFunds(
          "0x0000000000000000000000000000000000000000",
          1000,
          100,
          0,
          token.address
        )
    ).to.be.revertedWith("Cannot send to 0 address");

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 2000, 0, 0, token.address)
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(beneficiary.address, token.address, 2000, 0, 0);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("2")
    );
    expect(await token.balanceOf(committee.address)).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(await token.balanceOf(this.hats.address)).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("8")
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
    const instance = await this.HackFirst.attach(tx.events[0].args._instance);

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(committee)
        .retrieveFunds(beneficiary.address, 9000, 500, 500, token.address)
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(token.address, 9000, 500, 500);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("9")
    );
    expect(await token.balanceOf(committee.address)).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await token.balanceOf(this.hats.address)).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("0")
    );
  });
});
