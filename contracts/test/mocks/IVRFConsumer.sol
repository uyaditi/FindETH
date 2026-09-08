// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Exposes rawFulfillRandomWords so Foundry tests can simulate
 *      the VRF coordinator callback directly.
 */
interface IVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}
