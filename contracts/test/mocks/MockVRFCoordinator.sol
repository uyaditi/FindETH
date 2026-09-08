// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title MockVRFCoordinator
 * @notice Minimal mock of Chainlink VRF coordinator for local Foundry tests.
 *         Allows tests to control which requestId is returned and call
 *         rawFulfillRandomWords directly on the consumer.
 */
contract MockVRFCoordinator is VRFCoordinatorV2Interface {
    uint256 private _nextRequestId = 1;

    // requestId → consumer
    mapping(uint256 => address) public consumers;

    function requestRandomWords(
        bytes32, /* keyHash */
        uint64,  /* subId */
        uint16,  /* confirmations */
        uint32,  /* callbackGasLimit */
        uint32   /* numWords */
    ) external override returns (uint256 requestId) {
        requestId = _nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    // ─── Stub implementations (unused in tests) ───────────────────────────

    function getRequestConfig()
        external
        pure
        override
        returns (uint16, uint32, bytes32[] memory)
    {
        bytes32[] memory b;
        return (3, 200_000, b);
    }

    function createSubscription() external pure override returns (uint64) {
        return 1;
    }

    function getSubscription(uint64)
        external
        pure
        override
        returns (uint96, uint64, address, address[] memory)
    {
        address[] memory a;
        return (0, 0, address(0), a);
    }

    function requestSubscriptionOwnerTransfer(uint64, address) external override {}
    function acceptSubscriptionOwnerTransfer(uint64) external override {}

    function addConsumer(uint64, address) external override {}
    function removeConsumer(uint64, address) external override {}
    function cancelSubscription(uint64, address) external override {}
    function pendingRequestExists(uint64) external pure override returns (bool) { return false; }
}
