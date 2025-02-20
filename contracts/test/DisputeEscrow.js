const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = ethers;

describe("DisputeEscrow", function () {
  let disputeEscrow;
  let owner;
  let partyA;
  let partyB;

  beforeEach(async function () {
    [owner, partyA, partyB] = await ethers.getSigners();
    
    const DisputeEscrow = await ethers.getContractFactory("DisputeEscrow");
    disputeEscrow = await DisputeEscrow.deploy();
  });

  describe("Dispute Creation", function () {
    it("Should create a new dispute with correct deposit", async function () {
      const amount = parseEther("1.0");
      await expect(disputeEscrow.connect(partyA).createDispute({ value: amount }))
        .to.emit(disputeEscrow, "DisputeCreated")
        .withArgs(0, partyA.address, amount);

      const dispute = await disputeEscrow.disputes(0);
      expect(dispute.partyA).to.equal(partyA.address);
      expect(dispute.amount).to.equal(amount);
    });

    it("Should allow party B to join with matching deposit", async function () {
      const amount = parseEther("1.0");
      await disputeEscrow.connect(partyA).createDispute({ value: amount });
      
      await expect(disputeEscrow.connect(partyB).joinDispute(0, { value: amount }))
        .to.emit(disputeEscrow, "PartyJoined")
        .withArgs(0, partyB.address);

      const dispute = await disputeEscrow.disputes(0);
      expect(dispute.partyB).to.equal(partyB.address);
    });

    it("Should not allow joining with incorrect deposit amount", async function () {
      const amount = parseEther("1.0");
      await disputeEscrow.connect(partyA).createDispute({ value: amount });
      
      await expect(
        disputeEscrow.connect(partyB).joinDispute(0, { value: parseEther("0.5") })
      ).to.be.revertedWith("Must match initial deposit");
    });
  });

  describe("Case Submission", function () {
    beforeEach(async function () {
      const amount = parseEther("1.0");
      await disputeEscrow.connect(partyA).createDispute({ value: amount });
      await disputeEscrow.connect(partyB).joinDispute(0, { value: amount });
    });

    it("Should allow parties to submit their cases", async function () {
      await expect(disputeEscrow.connect(partyA).submitCase(0, "Party A's case"))
        .to.emit(disputeEscrow, "CaseSubmitted")
        .withArgs(0, partyA.address, "Party A's case");

      await expect(disputeEscrow.connect(partyB).submitCase(0, "Party B's case"))
        .to.emit(disputeEscrow, "CaseSubmitted")
        .withArgs(0, partyB.address, "Party B's case");

      const dispute = await disputeEscrow.disputes(0);
      expect(dispute.caseDataA).to.equal("Party A's case");
      expect(dispute.caseDataB).to.equal("Party B's case");
    });
  });

  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      const amount = parseEther("1.0");
      await disputeEscrow.connect(partyA).createDispute({ value: amount });
      await disputeEscrow.connect(partyB).joinDispute(0, { value: amount });
      await disputeEscrow.connect(partyA).submitCase(0, "Party A's case");
      await disputeEscrow.connect(partyB).submitCase(0, "Party B's case");
    });

    it("Should allow owner to resolve dispute and transfer funds", async function () {
      const initialBalance = await ethers.provider.getBalance(partyA.address);
      
      await expect(disputeEscrow.resolveDispute(0, partyA.address))
        .to.emit(disputeEscrow, "DisputeResolved")
        .withArgs(0, partyA.address);

      const dispute = await disputeEscrow.disputes(0);
      expect(dispute.isResolved).to.be.true;
      expect(dispute.winner).to.equal(partyA.address);

      const finalBalance = await ethers.provider.getBalance(partyA.address);
      expect(finalBalance - initialBalance).to.equal(parseEther("2.0"));
    });

    it("Should not allow non-owner to resolve dispute", async function () {
      await expect(
        disputeEscrow.connect(partyA).resolveDispute(0, partyA.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 