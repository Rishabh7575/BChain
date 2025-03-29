const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();

    let transantion = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transantion.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );
    transantion = await realEstate.connect(seller).approve(escrow.address, 1);
    await transantion.wait();
    transantion = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transantion.wait();
  });

  describe("Deployment", async () => {
    it("Returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("Returns seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });

    it("Returns inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });

    it("Returns  lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("Listing", async () => {
    it("Updates as Listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });

    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });

    it("Returns buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });
    it("Returns purchase price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });
    it("Returns escrow amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Deposits", async () => {
    it("Updates contract balance", async () => {
      const transantion = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transantion.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Inspection", async () => {
    it("Updates Inspection status", async () => {
      const transantion = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transantion.wait();
      const result = await escrow.inspectionPassed(1);
      expect(result).to.be.equal(true);
    });
  });

  describe("Approval", async () => {
    it("Updates approval status", async () => {
      let transantion = await escrow.connect(buyer).approveSale(1);
      await transantion.wait();

      transantion = await escrow.connect(seller).approveSale(1);
      await transantion.wait();

      transantion = await escrow.connect(lender).approveSale(1);
      await transantion.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("sale", async () => {
    beforeEach(async () => {
      let transantion = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transantion.wait();

      transantion = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transantion.wait();

      transantion = await escrow.connect(buyer).approveSale(1);
      await transantion.wait();

      transantion = await escrow.connect(seller).approveSale(1);
      await transantion.wait();

      transantion = await escrow.connect(lender).approveSale(1);
      await transantion.wait();

      transantion = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transantion.wait();

      await lender.sendTransaction({
        to: escrow.address,
        value: tokens(5),
      });
      transantion = await escrow.connect(seller).finalizeSale(1);
      await transantion.wait();
    });

    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });

    it("Updates balance ", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
