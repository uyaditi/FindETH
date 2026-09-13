// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TreasureHunt.sol";
import "../src/TreasureNFT.sol";

/**
 * @title SeedLocal
 * @notice Creates demo hunts on a local Anvil node for frontend development.
 *
 * Usage:
 *   forge script script/SeedLocal.s.sol --rpc-url http://localhost:8545 \
 *     --broadcast --private-key $PRIVATE_KEY
 *
 * Reads TREASURE_HUNT and TREASURE_NFT from deployment.json.
 */
contract SeedLocal is Script {
    function _oneClue(bytes32 answer) internal pure returns (bytes32[] memory clues) {
        clues = new bytes32[](1);
        clues[0] = answer;
    }

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // Read deployed addresses
        string memory json  = vm.readFile("deployment.json");
        address huntAddr    = vm.parseJsonAddress(json, ".TREASURE_HUNT");

        TreasureHunt hunt = TreasureHunt(payable(huntAddr));

        vm.startBroadcast(deployerKey);

        // ── Hunt 1: THE LOST ETHEREUM (Race, Medium) ───────────────────────
        hunt.createHunt{value: 0.05 ether}(
            _oneClue(keccak256(abi.encodePacked("genesis"))),
            TreasureHunt.HuntType.Race,
            block.timestamp + 7 days,
            "medium",
            "Blockchain"
        );

        // ── Hunt 2: THE MYSTERY OF THE GOLDEN BLOCK (MysteryDraw, Hard) ────
        hunt.createHunt{value: 0.10 ether}(
            _oneClue(keccak256(abi.encodePacked("satoshi"))),
            TreasureHunt.HuntType.MysteryDraw,
            block.timestamp + 3 days,
            "hard",
            "Blockchain"
        );

        // ── Hunt 3: LINEN & CO — THE SUMMER SECRET (MysteryDraw) ──────────
        hunt.createHunt{value: 0.05 ether}(
            _oneClue(keccak256(abi.encodePacked("linen"))),
            TreasureHunt.HuntType.MysteryDraw,
            block.timestamp + 5 days,
            "medium",
            "Fashion"
        );

        vm.stopBroadcast();

        console.log("Seeded 3 demo hunts.");
    }
}
