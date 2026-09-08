// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TreasureNFT.sol";
import "../src/TreasureHunt.sol";

/**
 * @title Deploy
 * @notice Deploys TreasureNFT and TreasureHunt.
 *
 * LOCAL (Anvil):
 *   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
 *     --broadcast --private-key $PRIVATE_KEY
 *
 * SEPOLIA:
 *   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
 *
 * Required env vars:
 *   PRIVATE_KEY            – deployer key
 *   VRF_COORDINATOR        – Chainlink VRF coordinator address
 *   VRF_KEY_HASH           – Chainlink VRF key hash
 *   VRF_SUBSCRIPTION_ID    – Chainlink VRF subscription id
 *   FEE_RECIPIENT          – address that receives platform fees
 *
 * Anvil defaults (pre-seeded when env vars are absent):
 *   VRF mocks are provided by a local MockVRFCoordinator deployment.
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        // ── Read config ────────────────────────────────────────────────────
        address vrfCoordinator  = vm.envOr("VRF_COORDINATOR",     address(0));
        bytes32 keyHash         = vm.envOr("VRF_KEY_HASH",        bytes32(0));
        uint64  subscriptionId  = uint64(vm.envOr("VRF_SUBSCRIPTION_ID", uint256(1)));
        address feeRecipient    = vm.envOr("FEE_RECIPIENT",        deployer);

        vm.startBroadcast(deployerKey);

        // ── Deploy NFT ─────────────────────────────────────────────────────
        TreasureNFT nft = new TreasureNFT(deployer);
        console.log("TreasureNFT deployed at:", address(nft));

        // ── Deploy Hunt ────────────────────────────────────────────────────
        // If VRF coordinator not provided, deploy the mock (local dev only)
        if (vrfCoordinator == address(0)) {
            // Import only in local context
            address mockVRF = deployCode("MockVRFCoordinator.sol");
            vrfCoordinator = mockVRF;
            console.log("MockVRFCoordinator deployed at:", mockVRF);
        }

        TreasureHunt hunt = new TreasureHunt(
            address(nft),
            vrfCoordinator,
            keyHash,
            subscriptionId,
            feeRecipient
        );
        console.log("TreasureHunt deployed at:", address(hunt));

        // ── Wire up minter ─────────────────────────────────────────────────
        nft.setMinter(address(hunt));
        console.log("NFT minter set to TreasureHunt");

        vm.stopBroadcast();

        // ── Write addresses to JSON for frontend consumption ───────────────
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "TREASURE_HUNT": "', vm.toString(address(hunt)), '",\n',
            '  "TREASURE_NFT": "',  vm.toString(address(nft)),  '"\n',
            '}'
        ));
        vm.writeFile("deployment.json", json);
        console.log("Deployment addresses written to deployment.json");
    }
}
