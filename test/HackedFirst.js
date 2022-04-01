const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployFactory } = require("../scripts/deploy-factory.js");

describe("HackedFirstFactory", function () {
  before(async function () {
    this.HackedFirst = await ethers.getContractFactory("HackedFirst");
    this.accounts = await ethers.getSigners();
    this.governance = this.accounts[0];
    const deployResults = await deployFactory(this.governance.address, true);
    this.hackedFirstFactory = deployResults.hackedFirstFactory;
    this.hackedFirstImplementation = deployResults.hackedFirstImplementation;
  });

  it("Cannot initialize the master copy", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];
    const governance = this.governance;
    await expect(
      this.hackedFirstImplementation.initialize(
        hacker.address,
        committee.address,
        beneficiary.address,
        governance.address
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Deploy an instance", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];
    const governance = this.governance;

    await expect(
      this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("Must have committee or beneficiary");

    const tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    expect(tx).to.emit("NewHackedFirstContract").withArgs(instance.address);
    expect(await instance.hacker()).to.equal(hacker.address);
    expect(await instance.committee()).to.equal(committee.address);
    expect(await instance.beneficiary()).to.equal(beneficiary.address);
    expect(await instance.governance()).to.equal(governance.address);

    await expect(
      instance.initialize(
        hacker.address,
        committee.address,
        beneficiary.address,
        governance.address
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Set beneficiary", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];
    const newBeneficiary = this.accounts[4];

    let tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.setBeneficiary(newBeneficiary.address)
    ).to.be.revertedWith("Only committee");

    tx = await (
      await instance.connect(committee).setBeneficiary(newBeneficiary.address)
    ).wait();
    expect(tx).to.emit("BeneficiaryChanged").withArgs(newBeneficiary.address);
    expect(await instance.beneficiary()).to.equal(newBeneficiary.address);
  });

  it("Retrieve funds (ETH)", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.retrieveFunds(
        1000,
        0,
        0,
        "0x0000000000000000000000000000000000000000"
      )
    ).to.be.revertedWith("Only beneficiary");

    await expect(
      instance
        .connect(beneficiary)
        .retrieveFunds(10, 0, 0, "0x0000000000000000000000000000000000000000")
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(beneficiary)
        .retrieveFunds(
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
        .connect(beneficiary)
        .retrieveFunds(1000, 0, 0, "0x0000000000000000000000000000000000000000")
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
      this.governance.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(
          1000,
          200,
          100,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs("0x0000000000000000000000000000000000000000", 1000, 200, 100);
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("1"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee.add(ethers.utils.parseEther("0.2"))
    );
    expect(await ethers.provider.getBalance(this.governance.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("0.1"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(
        ethers.utils
          .parseEther("8.7")
          .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
      )
    );
  });

  it("Retrieve funds (ETH no tips)", async function () {
    const hacker = this.accounts[1];
    const committee = { address: "0x0000000000000000000000000000000000000000" };
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });

    await expect(
      instance
        .connect(beneficiary)
        .retrieveFunds(
          1000,
          100,
          0,
          "0x0000000000000000000000000000000000000000"
        )
    ).to.be.revertedWith("Cannot tip 0 address");

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
      this.governance.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(2000, 0, 0, "0x0000000000000000000000000000000000000000")
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs("0x0000000000000000000000000000000000000000", 1000, 200, 100);
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("2"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee.add(ethers.utils.parseEther("0"))
    );
    expect(await ethers.provider.getBalance(this.governance.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("0"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(
        ethers.utils
          .parseEther("8")
          .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
      )
    );
  });

  it("Retrieve funds (ETH non to beneficiary)", async function () {
    const hacker = this.accounts[1];
    const committee = this.accounts[2];
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);

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
      this.governance.address
    );
    const initialBalanceBeneficiary = await ethers.provider.getBalance(
      beneficiary.address
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(
          8000,
          1000,
          1000,
          "0x0000000000000000000000000000000000000000"
        )
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs("0x0000000000000000000000000000000000000000", 8000, 1000, 1000);
    expect(await ethers.provider.getBalance(instance.address)).to.equal(0);
    expect(await ethers.provider.getBalance(hacker.address)).to.equal(
      initialBalanceHacker.add(ethers.utils.parseEther("8"))
    );
    expect(await ethers.provider.getBalance(committee.address)).to.equal(
      initialBalanceCommittee.add(ethers.utils.parseEther("1"))
    );
    expect(await ethers.provider.getBalance(this.governance.address)).to.equal(
      initialBalanceGovernance.add(ethers.utils.parseEther("1"))
    );
    expect(await ethers.provider.getBalance(beneficiary.address)).to.equal(
      initialBalanceBeneficiary.add(
        ethers.utils
          .parseEther("0")
          .sub(tx.effectiveGasPrice.mul(tx.cumulativeGasUsed))
      )
    );
  });

  it("Retrieve funds (ETH) failed to send", async function () {
    const hacker = this.accounts[1];
    const committee = this.hackedFirstFactory;
    const beneficiary = this.accounts[3];

    const tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);

    await hacker.sendTransaction({
      to: instance.address,
      value: ethers.utils.parseEther("10"),
    });
    await expect(
      instance
        .connect(beneficiary)
        .retrieveFunds(
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
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);
    await expect(
      instance.retrieveFunds(1000, 0, 0, token.address)
    ).to.be.revertedWith("Only beneficiary");

    await expect(
      instance.connect(beneficiary).retrieveFunds(10, 0, 0, token.address)
    ).to.be.revertedWith("Bounty must be at least 10%");

    await expect(
      instance
        .connect(beneficiary)
        .retrieveFunds(2000, 4000, 5000, token.address)
    ).to.be.revertedWith(
      "panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    await expect(
      instance.connect(beneficiary).retrieveFunds(1000, 0, 0, token.address)
    ).to.be.revertedWith("No tokens in the contract");

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(1000, 200, 100, token.address)
    ).wait();
    expect(tx)
      .to.emit("FundsRetrieved")
      .withArgs(token.address, 1000, 200, 100);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await token.balanceOf(committee.address)).to.equal(
      ethers.utils.parseEther("0.2")
    );
    expect(await token.balanceOf(this.governance.address)).to.equal(
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
    const committee = { address: "0x0000000000000000000000000000000000000000" };
    const beneficiary = this.accounts[3];

    let tx = await (
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    await expect(
      instance.connect(beneficiary).retrieveFunds(1000, 100, 0, token.address)
    ).to.be.revertedWith("Cannot tip 0 address");

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(2000, 0, 0, token.address)
    ).wait();
    expect(tx).to.emit("FundsRetrieved").withArgs(token.address, 2000, 0, 0);
    expect(await token.balanceOf(instance.address)).to.equal(0);
    expect(await token.balanceOf(hacker.address)).to.equal(
      ethers.utils.parseEther("2")
    );
    expect(await token.balanceOf(committee.address)).to.equal(
      ethers.utils.parseEther("0")
    );
    expect(await token.balanceOf(this.governance.address)).to.equal(
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
      await this.hackedFirstFactory.createHackedFirstContract(
        hacker.address,
        committee.address,
        beneficiary.address
      )
    ).wait();
    const instance = await this.HackedFirst.attach(tx.events[0].args._instance);

    await token.transfer(instance.address, ethers.utils.parseEther("10"));

    expect(await token.balanceOf(instance.address)).to.equal(
      ethers.utils.parseEther("10")
    );

    tx = await (
      await instance
        .connect(beneficiary)
        .retrieveFunds(9000, 500, 500, token.address)
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
    expect(await token.balanceOf(this.governance.address)).to.equal(
      ethers.utils.parseEther("0.5")
    );
    expect(await token.balanceOf(beneficiary.address)).to.equal(
      ethers.utils.parseEther("0")
    );
  });
});
