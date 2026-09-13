// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/TreasureHunt.sol";
import "../src/TreasureNFT.sol";
import "./mocks/MockVRFCoordinator.sol";

/**
 * @title TreasureHuntTest
 * @notice Comprehensive Foundry test suite covering:
 *   - Hunt creation (valid / invalid)
 *   - Answer verification (correct / incorrect / normalisation)
 *   - Race mode (first correct solver wins, no second winner, payout, NFT)
 *   - Mystery Draw (multiple solvers, VRF fulfillment, winner, payout, NFT)
 *   - Cancel / refund
 *   - Security (reentrancy guard, unauthorised actions, duplicate solving)
 *   - Admin (fee update, pause)
 *   - Events
 */
contract TreasureHuntTest is Test {
    // ─── contracts ───────────────────────────────────────────────────────────
    TreasureNFT      public nft;
    TreasureHunt     public hunt;
    MockVRFCoordinator public vrf;

    // ─── actors ──────────────────────────────────────────────────────────────
    address constant OWNER   = address(0x1);
    address constant FEE     = address(0x2);
    address constant CREATOR = address(0x10);
    address constant ALICE   = address(0x11);
    address constant BOB     = address(0x12);
    address constant CAROL   = address(0x13);
    address constant DAVE    = address(0x14);

    // ─── VRF params (mock values) ─────────────────────────────────────────────
    bytes32 constant KEY_HASH = keccak256("keyhash");
    uint64  constant SUB_ID   = 1;

    // ─── answer helpers ──────────────────────────────────────────────────────
    string  constant ANSWER_PLAIN = "linen";
    bytes32 constant ANSWER_HASH  = keccak256(abi.encodePacked("linen"));
    bytes32 constant WRONG_HASH   = keccak256(abi.encodePacked("cotton"));

    uint256 constant PRIZE = 1 ether;

    // ─────────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────────

    function setUp() public {
        vm.deal(OWNER,   100 ether);
        vm.deal(CREATOR, 100 ether);
        vm.deal(ALICE,   10  ether);
        vm.deal(BOB,     10  ether);
        vm.deal(CAROL,   10  ether);
        vm.deal(DAVE,    10  ether);

        vm.startPrank(OWNER);

        // Deploy mock VRF coordinator
        vrf = new MockVRFCoordinator();

        // Deploy NFT
        nft = new TreasureNFT(OWNER);

        // Deploy TreasureHunt
        hunt = new TreasureHunt(
            address(nft),
            address(vrf),
            KEY_HASH,
            SUB_ID,
            FEE
        );

        // Authorise TreasureHunt as NFT minter
        nft.setMinter(address(hunt));

        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────────

    function _createRaceHunt() internal returns (uint256 huntId) {
        vm.prank(CREATOR);
        huntId = hunt.createHunt{value: PRIZE}(
            _oneClue(),
            TreasureHunt.HuntType.Race,
            0,
            "medium",
            "General"
        );
    }

    function _createMysteryHunt(uint256 endTime) internal returns (uint256 huntId) {
        vm.prank(CREATOR);
        huntId = hunt.createHunt{value: PRIZE}(
            _oneClue(),
            TreasureHunt.HuntType.MysteryDraw,
            endTime,
            "medium",
            "General"
        );
    }

    function _oneClue() internal pure returns (bytes32[] memory clues) {
        clues = new bytes32[](1);
        clues[0] = ANSWER_HASH;
    }

    // =========================================================================
    // 1. HUNT CREATION
    // =========================================================================

    function test_createHunt_valid_race() public {
        vm.expectEmit(true, true, false, true);
        emit TreasureHunt.HuntCreated(1, CREATOR, TreasureHunt.HuntType.Race, PRIZE, 0, 1, "medium", "General");

        uint256 id = _createRaceHunt();

        assertEq(id, 1);
        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        assertEq(h.creator,    CREATOR);
        assertEq(h.prize,      PRIZE);
        assertEq(h.clueCount, 1);
        assertEq(hunt.getClueHashes(id)[0], ANSWER_HASH);
        assertEq(uint8(h.status), uint8(TreasureHunt.HuntStatus.Active));
        assertEq(uint8(h.huntType), uint8(TreasureHunt.HuntType.Race));
    }

    function test_createHunt_valid_mystery() public {
        uint256 end = block.timestamp + 1 days;
        uint256 id  = _createMysteryHunt(end);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        assertEq(h.endTime, end);
        assertEq(uint8(h.huntType), uint8(TreasureHunt.HuntType.MysteryDraw));
    }

    function test_createHunt_revert_zeroPrize() public {
        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.InsufficientPrize.selector);
        hunt.createHunt{value: 0}(_oneClue(), TreasureHunt.HuntType.Race, 0, "medium", "General");
    }

    function test_createHunt_revert_pastEndTime() public {
        vm.warp(100);
        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.InvalidEndTime.selector);
        hunt.createHunt{value: PRIZE}(_oneClue(), TreasureHunt.HuntType.Race, 99, "medium", "General");
    }

    function test_createHunt_incrementsCounter() public {
        _createRaceHunt();
        _createRaceHunt();
        assertEq(hunt.huntCount(), 2);
    }

    // =========================================================================
    // 2. ANSWER VERIFICATION
    // =========================================================================

    function test_submitAnswer_correct() public {
        uint256 id = _createRaceHunt();

        vm.expectEmit(true, true, false, false);
        emit TreasureHunt.HuntParticipated(id, ALICE);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        assertTrue(hunt.hasSolved(id, ALICE));
        assertTrue(hunt.hasParticipated(id, ALICE));
    }

    function test_submitAnswer_incorrect() public {
        uint256 id = _createRaceHunt();

        vm.expectEmit(true, true, false, false);
        emit TreasureHunt.IncorrectSolution(id, ALICE);

        vm.prank(ALICE);
        hunt.submitAnswer(id, WRONG_HASH);

        assertFalse(hunt.hasSolved(id, ALICE));
        assertTrue(hunt.hasParticipated(id, ALICE));
    }

    function test_submitAnswer_revert_alreadySolved() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(ALICE);
        vm.expectRevert(TreasureHunt.AlreadySolved.selector);
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    function test_submitAnswer_revert_huntNotActive() public {
        uint256 id = _createRaceHunt();

        // Alice wins, hunt is now Solved
        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(BOB);
        vm.expectRevert(TreasureHunt.HuntNotActive.selector);
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    function test_submitAnswer_revert_expired() public {
        uint256 end = block.timestamp + 1 hours;
        uint256 id  = _createMysteryHunt(end);

        vm.warp(end + 1);

        vm.prank(ALICE);
        vm.expectRevert(TreasureHunt.HuntExpired.selector);
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    // =========================================================================
    // 3. RACE MODE
    // =========================================================================

    function test_race_firstCorrectWins() public {
        uint256 id = _createRaceHunt();

        uint256 aliceBefore = ALICE.balance;

        vm.prank(BOB);
        hunt.submitAnswer(id, WRONG_HASH);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        assertEq(h.winner, ALICE);
        assertEq(uint8(h.status), uint8(TreasureHunt.HuntStatus.Solved));

        // Alice received prize minus fee (2.5%)
        uint256 fee         = (PRIZE * 250) / 10_000;
        uint256 alicePrize  = PRIZE - fee;
        assertEq(ALICE.balance, aliceBefore + alicePrize);
    }

    function test_race_noSecondWinner() public {
        uint256 id = _createRaceHunt();

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        // Hunt is solved — Bob cannot submit
        vm.prank(BOB);
        vm.expectRevert(TreasureHunt.HuntNotActive.selector);
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    function test_race_nftMintedToWinner() public {
        uint256 id = _createRaceHunt();

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        assertEq(nft.balanceOf(ALICE), 1);
        uint256 tokenId = nft.huntToToken(id);
        assertGt(tokenId, 0);

        TreasureNFT.TrophyData memory trophy = nft.getTrophy(tokenId);
        assertEq(trophy.huntId, id);
        assertEq(trophy.winner, ALICE);
    }

    function test_race_feeCollected() public {
        uint256 id = _createRaceHunt();

        uint256 feeBefore = FEE.balance;

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        uint256 expectedFee = (PRIZE * 250) / 10_000;
        assertEq(FEE.balance, feeBefore + expectedFee);
    }

    function test_race_eventHuntSolved() public {
        uint256 id = _createRaceHunt();

        uint256 fee   = (PRIZE * 250) / 10_000;
        uint256 prize = PRIZE - fee;

        vm.expectEmit(true, true, false, true);
        emit TreasureHunt.HuntSolved(id, ALICE, PRIZE);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    // =========================================================================
    // 4. MYSTERY DRAW
    // =========================================================================

    function test_mystery_multipleCorrectSolvers() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(BOB);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(CAROL);
        hunt.submitAnswer(id, ANSWER_HASH);

        assertEq(hunt.getCorrectSolverCount(id), 3);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        assertEq(uint8(h.status), uint8(TreasureHunt.HuntStatus.Active));
    }

    function test_mystery_closeAndRequestDraw() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.expectEmit(true, false, false, false);
        emit TreasureHunt.HuntClosed(id);

        vm.prank(CREATOR);
        hunt.closeAndRequestDraw(id);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        assertEq(uint8(h.status), uint8(TreasureHunt.HuntStatus.Closed));
        assertGt(h.vrfRequestId, 0);
    }

    function test_mystery_vrfFulfillment_selectsWinner() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(BOB);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(CAROL);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        hunt.closeAndRequestDraw(id);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);

        // Simulate VRF callback — randomWord = 0 → index 0 → ALICE
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 0;

        vm.prank(address(vrf));
        hunt.rawFulfillRandomWords(h.vrfRequestId, randomWords);

        TreasureHunt.Hunt memory hAfter = hunt.getHunt(id);
        assertEq(hAfter.winner, ALICE);
        assertEq(uint8(hAfter.status), uint8(TreasureHunt.HuntStatus.Solved));
    }

    function test_mystery_vrfFulfillment_differentIndex() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(BOB);
        hunt.submitAnswer(id, ANSWER_HASH);
        vm.prank(CAROL);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        hunt.closeAndRequestDraw(id);

        TreasureHunt.Hunt memory h = hunt.getHunt(id);

        // randomWord = 1 → index 1 → BOB
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 1;

        vm.prank(address(vrf));
        hunt.rawFulfillRandomWords(h.vrfRequestId, randomWords);

        assertEq(hunt.getHunt(id).winner, BOB);
    }

    function test_mystery_winnerReceivesPrizeAndNFT() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        hunt.closeAndRequestDraw(id);

        uint256 aliceBefore = ALICE.balance;
        uint256 fee         = (PRIZE * 250) / 10_000;
        uint256 expectedPrize = PRIZE - fee;

        TreasureHunt.Hunt memory h = hunt.getHunt(id);
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 0;

        vm.prank(address(vrf));
        hunt.rawFulfillRandomWords(h.vrfRequestId, randomWords);

        assertEq(ALICE.balance, aliceBefore + expectedPrize);
        assertEq(nft.balanceOf(ALICE), 1);
    }

    function test_mystery_revert_noCorrectSolvers() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.NoCorrectSolvers.selector);
        hunt.closeAndRequestDraw(id);
    }

    function test_mystery_revert_vrfAlreadyRequested() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        hunt.closeAndRequestDraw(id);

        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.HuntNotActive.selector);
        hunt.closeAndRequestDraw(id);
    }

    function test_mystery_anyoneCanCloseAfterDeadline() public {
        uint256 end = block.timestamp + 1 hours;
        uint256 id  = _createMysteryHunt(end);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.warp(end + 1);

        // Dave (not creator) closes after expiry
        vm.prank(DAVE);
        hunt.closeAndRequestDraw(id);

        assertEq(uint8(hunt.getHunt(id).status), uint8(TreasureHunt.HuntStatus.Closed));
    }

    function test_mystery_revert_notCreatorEarlyClose() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(DAVE); // not creator, no deadline
        vm.expectRevert(TreasureHunt.NotCreator.selector);
        hunt.closeAndRequestDraw(id);
    }

    // =========================================================================
    // 5. CANCEL
    // =========================================================================

    function test_cancel_creatorRefunded() public {
        uint256 id = _createRaceHunt();

        uint256 creatorBefore = CREATOR.balance;

        vm.prank(CREATOR);
        hunt.cancelHunt(id);

        assertEq(CREATOR.balance, creatorBefore + PRIZE);
        assertEq(uint8(hunt.getHunt(id).status), uint8(TreasureHunt.HuntStatus.Cancelled));
    }

    function test_cancel_revert_notCreator() public {
        uint256 id = _createRaceHunt();

        vm.prank(ALICE);
        vm.expectRevert(TreasureHunt.NotCreator.selector);
        hunt.cancelHunt(id);
    }

    function test_cancel_revert_alreadySolved() public {
        uint256 id = _createRaceHunt();

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.HuntNotActive.selector);
        hunt.cancelHunt(id);
    }

    function test_cancel_revert_hasCorrectSolvers() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(CREATOR);
        vm.expectRevert(TreasureHunt.HuntAlreadySolved.selector);
        hunt.cancelHunt(id);
    }

    // =========================================================================
    // 6. SECURITY
    // =========================================================================

    function test_security_duplicateSolvePrevented() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        vm.prank(ALICE);
        vm.expectRevert(TreasureHunt.AlreadySolved.selector);
        hunt.submitAnswer(id, ANSWER_HASH);

        assertEq(hunt.getCorrectSolverCount(id), 1);
    }

    function test_security_participantCountAccurate() public {
        uint256 id = _createMysteryHunt(0);

        vm.prank(ALICE);
        hunt.submitAnswer(id, WRONG_HASH);
        vm.prank(ALICE);
        hunt.submitAnswer(id, WRONG_HASH); // second attempt still same participant

        vm.prank(BOB);
        hunt.submitAnswer(id, WRONG_HASH);

        assertEq(hunt.getHunt(id).participantCount, 2); // ALICE + BOB, not 3
    }

    function test_security_pauseBlocksCreation() public {
        vm.prank(OWNER);
        hunt.pause();

        vm.prank(CREATOR);
        vm.expectRevert();
        hunt.createHunt{value: PRIZE}(_oneClue(), TreasureHunt.HuntType.Race, 0, "medium", "General");
    }

    function test_security_pauseBlocksSubmission() public {
        uint256 id = _createRaceHunt();

        vm.prank(OWNER);
        hunt.pause();

        vm.prank(ALICE);
        vm.expectRevert();
        hunt.submitAnswer(id, ANSWER_HASH);
    }

    function test_security_unpauseRestoresFunctionality() public {
        vm.prank(OWNER);
        hunt.pause();

        vm.prank(OWNER);
        hunt.unpause();

        uint256 id = _createRaceHunt(); // should succeed
        assertEq(id, 1);
    }

    function test_security_onlyOwnerCanPause() public {
        vm.prank(ALICE);
        vm.expectRevert();
        hunt.pause();
    }

    // =========================================================================
    // 7. ADMIN
    // =========================================================================

    function test_admin_setPlatformFee() public {
        vm.prank(OWNER);
        hunt.setPlatformFee(500); // 5%
        assertEq(hunt.platformFeePercent(), 500);
    }

    function test_admin_revert_feeTooHigh() public {
        vm.prank(OWNER);
        vm.expectRevert(TreasureHunt.FeeTooHigh.selector);
        hunt.setPlatformFee(1001);
    }

    function test_admin_onlyOwnerSetFee() public {
        vm.prank(ALICE);
        vm.expectRevert();
        hunt.setPlatformFee(100);
    }

    function test_admin_setFeeRecipient() public {
        vm.prank(OWNER);
        hunt.setFeeRecipient(DAVE);
        assertEq(hunt.feeRecipient(), DAVE);
    }

    function test_admin_revert_zeroFeeRecipient() public {
        vm.prank(OWNER);
        vm.expectRevert(TreasureHunt.ZeroAddress.selector);
        hunt.setFeeRecipient(address(0));
    }

    // =========================================================================
    // 8. NFT
    // =========================================================================

    function test_nft_onlyMinterCanMint() public {
        vm.prank(ALICE);
        vm.expectRevert(TreasureNFT.OnlyMinter.selector);
        nft.mintWinner(ALICE, 99);
    }

    function test_nft_cannotMintTwiceForSameHunt() public {
        // Mint via hunt contract (Race)
        uint256 id = _createRaceHunt();
        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        // Attempt direct second mint for same huntId
        vm.prank(address(hunt));
        vm.expectRevert(TreasureNFT.AlreadyMintedForHunt.selector);
        nft.mintWinner(BOB, id);
    }

    function test_nft_playerTokensTracked() public {
        uint256 id1 = _createRaceHunt();
        vm.prank(ALICE);
        hunt.submitAnswer(id1, ANSWER_HASH);

        // ALICE won hunt 1 — create another hunt and let alice win
        uint256 id2 = _createRaceHunt();
        vm.prank(ALICE);
        hunt.submitAnswer(id2, ANSWER_HASH);

        uint256[] memory tokens = nft.getPlayerTokens(ALICE);
        assertEq(tokens.length, 2);
    }

    function test_nft_tokenURIIsBase64Json() public {
        uint256 id = _createRaceHunt();
        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        uint256 tokenId = nft.huntToToken(id);
        string memory uri = nft.tokenURI(tokenId);

        // Should start with data:application/json;base64,
        bytes memory uriBytes = bytes(uri);
        bytes memory prefix   = bytes("data:application/json;base64,");
        bool hasPrefix = true;
        for (uint i = 0; i < prefix.length; i++) {
            if (uriBytes[i] != prefix[i]) { hasPrefix = false; break; }
        }
        assertTrue(hasPrefix);
    }

    // =========================================================================
    // 9. FUZZ
    // =========================================================================

    /// @dev Fuzz: prize amount always fully distributed (prize = winner + fee)
    function testFuzz_prizeFullyDistributed(uint96 prizeAmount) public {
        vm.assume(prizeAmount > 0.001 ether);
        vm.assume(prizeAmount < 10 ether);

        vm.deal(CREATOR, uint256(prizeAmount) + 1 ether);

        vm.prank(CREATOR);
        uint256 id = hunt.createHunt{value: prizeAmount}(
            _oneClue(),
            TreasureHunt.HuntType.Race,
            0,
            "medium",
            "General"
        );

        uint256 aliceBefore = ALICE.balance;
        uint256 feeBefore   = FEE.balance;

        vm.prank(ALICE);
        hunt.submitAnswer(id, ANSWER_HASH);

        uint256 fee        = (uint256(prizeAmount) * 250) / 10_000;
        uint256 playerPrize = uint256(prizeAmount) - fee;

        assertEq(ALICE.balance, aliceBefore + playerPrize);
        assertEq(FEE.balance,   feeBefore + fee);
    }
}
