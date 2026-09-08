// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "./TreasureNFT.sol";

/**
 * @title TreasureHunt
 * @notice Core contract for Internet Treasure Hunts platform.
 *         Supports Race (first correct solver wins) and Mystery Draw
 *         (Chainlink VRF selects a random winner from all correct solvers).
 */
contract TreasureHunt is ReentrancyGuard, Ownable, Pausable, VRFConsumerBaseV2 {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum HuntType { Race, MysteryDraw }
    enum HuntStatus { Active, Closed, Solved, Cancelled }

    struct Hunt {
        uint256 id;
        address creator;
        bytes32 answerHash;       // keccak256(normalised answer) — never plaintext
        uint256 prize;            // wei
        uint256 participantCount;
        uint256 correctCount;
        uint256 createdAt;
        uint256 endTime;          // 0 = no deadline
        HuntType huntType;
        HuntStatus status;
        address winner;
        uint256 vrfRequestId;     // set when VRF draw is requested
        bool prizeClaimed;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    TreasureNFT public immutable nft;

    VRFCoordinatorV2Interface public immutable vrfCoordinator;
    bytes32 public immutable keyHash;
    uint64  public immutable subscriptionId;
    uint32  public constant  CALLBACK_GAS_LIMIT = 200_000;
    uint16  public constant  REQUEST_CONFIRMATIONS = 3;
    uint32  public constant  NUM_WORDS = 1;

    uint256 public huntCount;
    uint256 public platformFeePercent = 250; // 2.5 % in basis points (250/10000)
    address public feeRecipient;

    /// huntId → Hunt
    mapping(uint256 => Hunt) public hunts;

    /// huntId → player → has participated
    mapping(uint256 => mapping(address => bool)) public hasParticipated;

    /// huntId → player → has solved correctly
    mapping(uint256 => mapping(address => bool)) public hasSolved;

    /// huntId → ordered list of correct solvers (for Mystery Draw)
    mapping(uint256 => address[]) public correctSolvers;

    /// VRF requestId → huntId
    mapping(uint256 => uint256) public vrfRequestToHunt;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event HuntCreated(
        uint256 indexed huntId,
        address indexed creator,
        HuntType huntType,
        uint256 prize,
        uint256 endTime
    );
    event HuntParticipated(uint256 indexed huntId, address indexed player);
    event CorrectSolution(uint256 indexed huntId, address indexed player, uint256 position);
    event IncorrectSolution(uint256 indexed huntId, address indexed player);
    event HuntSolved(uint256 indexed huntId, address indexed winner, uint256 prize);
    event RandomnessRequested(uint256 indexed huntId, uint256 indexed requestId);
    event WinnerSelected(uint256 indexed huntId, address indexed winner, uint256 randomWord);
    event PrizeClaimed(uint256 indexed huntId, address indexed winner, uint256 amount);
    event NFTMinted(uint256 indexed huntId, address indexed winner, uint256 tokenId);
    event HuntClosed(uint256 indexed huntId);
    event HuntCancelled(uint256 indexed huntId);
    event PlatformFeeUpdated(uint256 newFee);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error HuntNotActive();
    error HuntExpired();
    error HuntNotClosed();
    error AlreadyParticipated();
    error AlreadySolved();
    error NoCorrectSolvers();
    error NotCreator();
    error NotWinner();
    error PrizeAlreadyClaimed();
    error InsufficientPrize();
    error InvalidEndTime();
    error VRFAlreadyRequested();
    error ZeroAddress();
    error HuntAlreadySolved();
    error FeeTooHigh();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address _nft,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64  _subscriptionId,
        address _feeRecipient
    )
        Ownable(msg.sender)
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        if (_nft == address(0) || _vrfCoordinator == address(0) || _feeRecipient == address(0))
            revert ZeroAddress();

        nft           = TreasureNFT(_nft);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash        = _keyHash;
        subscriptionId = _subscriptionId;
        feeRecipient   = _feeRecipient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Hunt creation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a new treasure hunt and fund the prize.
     * @param answerHash  keccak256 hash of the normalised final answer.
     * @param huntType    Race or MysteryDraw.
     * @param endTime     Unix timestamp deadline. 0 = no deadline.
     */
    function createHunt(
        bytes32   answerHash,
        HuntType  huntType,
        uint256   endTime
    )
        external
        payable
        whenNotPaused
        returns (uint256 huntId)
    {
        if (msg.value == 0) revert InsufficientPrize();
        if (endTime != 0 && endTime <= block.timestamp) revert InvalidEndTime();

        huntId = ++huntCount;

        hunts[huntId] = Hunt({
            id:              huntId,
            creator:         msg.sender,
            answerHash:      answerHash,
            prize:           msg.value,
            participantCount: 0,
            correctCount:    0,
            createdAt:       block.timestamp,
            endTime:         endTime,
            huntType:        huntType,
            status:          HuntStatus.Active,
            winner:          address(0),
            vrfRequestId:    0,
            prizeClaimed:    false
        });

        emit HuntCreated(huntId, msg.sender, huntType, msg.value, endTime);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Playing
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Submit an answer for a hunt.
     *         The frontend sends keccak256(normalise(answer)) — never plaintext.
     * @param huntId      The hunt to submit for.
     * @param answerHash  keccak256 of the player's normalised answer guess.
     */
    function submitAnswer(uint256 huntId, bytes32 answerHash)
        external
        nonReentrant
        whenNotPaused
    {
        Hunt storage hunt = hunts[huntId];

        if (hunt.status != HuntStatus.Active) revert HuntNotActive();
        if (hunt.endTime != 0 && block.timestamp > hunt.endTime) revert HuntExpired();
        if (hasSolved[huntId][msg.sender]) revert AlreadySolved();

        // Track participation (first submission)
        if (!hasParticipated[huntId][msg.sender]) {
            hasParticipated[huntId][msg.sender] = true;
            hunt.participantCount++;
            emit HuntParticipated(huntId, msg.sender);
        }

        if (answerHash == hunt.answerHash) {
            // ── Correct ──────────────────────────────────────────────────────
            hasSolved[huntId][msg.sender] = true;
            hunt.correctCount++;
            correctSolvers[huntId].push(msg.sender);

            emit CorrectSolution(huntId, msg.sender, hunt.correctCount);

            if (hunt.huntType == HuntType.Race) {
                // First correct solver wins immediately
                _finalise(huntId, msg.sender);
            }
            // For MysteryDraw we accumulate solvers; creator/owner calls closeAndDraw
        } else {
            emit IncorrectSolution(huntId, msg.sender);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mystery Draw — close and request VRF
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Close a MysteryDraw hunt and request Chainlink VRF randomness.
     *         Can be called by the creator or by anyone if the hunt has expired.
     */
    function closeAndRequestDraw(uint256 huntId)
        external
        nonReentrant
        whenNotPaused
    {
        Hunt storage hunt = hunts[huntId];

        if (hunt.status != HuntStatus.Active) revert HuntNotActive();
        if (hunt.huntType != HuntType.MysteryDraw) revert HuntNotActive();

        // Only creator can close early; anyone can close after deadline
        bool isCreator  = msg.sender == hunt.creator;
        bool hasExpired = hunt.endTime != 0 && block.timestamp > hunt.endTime;
        if (!isCreator && !hasExpired) revert NotCreator();

        if (correctSolvers[huntId].length == 0) revert NoCorrectSolvers();
        if (hunt.vrfRequestId != 0) revert VRFAlreadyRequested();

        hunt.status = HuntStatus.Closed;
        emit HuntClosed(huntId);

        // Request verifiable randomness
        uint256 requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );

        hunt.vrfRequestId = requestId;
        vrfRequestToHunt[requestId] = huntId;

        emit RandomnessRequested(huntId, requestId);
    }

    /**
     * @dev Chainlink VRF callback — select winner from eligible solvers.
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        uint256 huntId = vrfRequestToHunt[requestId];
        Hunt storage hunt = hunts[huntId];
        address[] storage solvers = correctSolvers[huntId];

        uint256 winnerIndex = randomWords[0] % solvers.length;
        address winner = solvers[winnerIndex];

        emit WinnerSelected(huntId, winner, randomWords[0]);

        _finalise(huntId, winner);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal finalisation
    // ─────────────────────────────────────────────────────────────────────────

    function _finalise(uint256 huntId, address winner) internal {
        Hunt storage hunt = hunts[huntId];

        hunt.status = HuntStatus.Solved;
        hunt.winner = winner;

        emit HuntSolved(huntId, winner, hunt.prize);

        // Calculate and split prize
        uint256 fee        = (hunt.prize * platformFeePercent) / 10_000;
        uint256 playerPrize = hunt.prize - fee;

        // Transfer prize to winner
        (bool sent,) = payable(winner).call{value: playerPrize}("");
        if (sent) {
            hunt.prizeClaimed = true;
            emit PrizeClaimed(huntId, winner, playerPrize);
        }

        // Transfer platform fee
        if (fee > 0) {
            (bool feeSent,) = payable(feeRecipient).call{value: fee}("");
            // Fee transfer failure is non-fatal; will remain in contract
            if (!feeSent) { /* silent — fee accumulates in contract */ }
        }

        // Mint Treasure NFT to winner
        uint256 tokenId = nft.mintWinner(winner, huntId);
        emit NFTMinted(huntId, winner, tokenId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Creator — cancel hunt and reclaim prize
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Cancel an active hunt with no correct solvers and reclaim prize.
     *         Only callable by the creator.
     */
    function cancelHunt(uint256 huntId) external nonReentrant {
        Hunt storage hunt = hunts[huntId];

        if (msg.sender != hunt.creator) revert NotCreator();
        if (hunt.status != HuntStatus.Active) revert HuntNotActive();
        if (hunt.correctCount > 0) revert HuntAlreadySolved();

        hunt.status = HuntStatus.Cancelled;
        emit HuntCancelled(huntId);

        (bool sent,) = payable(hunt.creator).call{value: hunt.prize}("");
        require(sent, "Refund failed");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setPlatformFee(uint256 newFeePercent) external onlyOwner {
        if (newFeePercent > 1000) revert FeeTooHigh(); // max 10 %
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function getHunt(uint256 huntId) external view returns (Hunt memory) {
        return hunts[huntId];
    }

    function getCorrectSolvers(uint256 huntId) external view returns (address[] memory) {
        return correctSolvers[huntId];
    }

    function getCorrectSolverCount(uint256 huntId) external view returns (uint256) {
        return correctSolvers[huntId].length;
    }

    function isExpired(uint256 huntId) external view returns (bool) {
        Hunt storage hunt = hunts[huntId];
        return hunt.endTime != 0 && block.timestamp > hunt.endTime;
    }

    // Allow contract to receive ETH (e.g. accumulated fees withdrawal)
    receive() external payable {}

    function withdrawAccumulatedFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        (bool sent,) = payable(feeRecipient).call{value: balance}("");
        require(sent, "Withdraw failed");
    }
}
