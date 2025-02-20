// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DisputeEscrow
 * @dev Manages disputes and escrow between two parties
 */
contract DisputeEscrow is ReentrancyGuard, Ownable {
    struct Dispute {
        address partyA;
        address partyB;
        uint256 amount;
        string caseDataA;
        string caseDataB;
        bool isResolved;
        address winner;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    mapping(uint256 => Dispute) public disputes;
    uint256 public nextDisputeId;
    
    event DisputeCreated(uint256 indexed disputeId, address indexed partyA, uint256 amount);
    event PartyJoined(uint256 indexed disputeId, address indexed partyB);
    event CaseSubmitted(uint256 indexed disputeId, address indexed party, string caseData);
    event DisputeResolved(uint256 indexed disputeId, address indexed winner);

    constructor() {
        _transferOwnership(msg.sender);
    }

    function createDispute() external payable returns (uint256) {
        require(msg.value > 0, "Must deposit funds");
        
        uint256 disputeId = nextDisputeId++;
        disputes[disputeId] = Dispute({
            partyA: msg.sender,
            partyB: address(0),
            amount: msg.value,
            caseDataA: "",
            caseDataB: "",
            isResolved: false,
            winner: address(0),
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        emit DisputeCreated(disputeId, msg.sender, msg.value);
        return disputeId;
    }

    function joinDispute(uint256 disputeId) external payable {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.partyA != address(0), "Dispute doesn't exist");
        require(dispute.partyB == address(0), "Dispute already has two parties");
        require(msg.value == dispute.amount, "Must match initial deposit");

        dispute.partyB = msg.sender;
        emit PartyJoined(disputeId, msg.sender);
    }

    function submitCase(uint256 disputeId, string calldata caseData) external {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.isResolved, "Dispute is resolved");
        require(msg.sender == dispute.partyA || msg.sender == dispute.partyB, "Not a party");

        if (msg.sender == dispute.partyA) {
            dispute.caseDataA = caseData;
        } else {
            dispute.caseDataB = caseData;
        }

        emit CaseSubmitted(disputeId, msg.sender, caseData);
    }

    function resolveDispute(uint256 disputeId, address winner) external onlyOwner nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.isResolved, "Already resolved");
        require(winner == dispute.partyA || winner == dispute.partyB, "Invalid winner");

        dispute.isResolved = true;
        dispute.winner = winner;
        dispute.resolvedAt = block.timestamp;

        uint256 totalAmount = dispute.amount * 2;
        (bool success, ) = winner.call{value: totalAmount}("");
        require(success, "Transfer failed");

        emit DisputeResolved(disputeId, winner);
    }

    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }
} 