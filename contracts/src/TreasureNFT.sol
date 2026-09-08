// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title TreasureNFT
 * @notice ERC-721 achievement token minted to the winner of each hunt.
 *         Metadata is fully on-chain; no external IPFS dependency for core data.
 *         The TreasureHunt contract (minter role) is the only address authorised
 *         to mint new tokens.
 */
contract TreasureNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;
    using Strings for address;

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    struct TrophyData {
        uint256 huntId;
        address winner;
        uint256 mintedAt;
        uint256 prizeAmount; // wei
        string  huntTitle;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    uint256 private _tokenIdCounter;

    /// Address authorised to call mintWinner (the TreasureHunt contract)
    address public minter;

    /// tokenId → trophy metadata
    mapping(uint256 => TrophyData) public trophies;

    /// huntId → tokenId (one NFT per hunt)
    mapping(uint256 => uint256) public huntToToken;

    /// player → all tokenIds they own (for profile view)
    mapping(address => uint256[]) public playerTokens;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event TrophyMinted(uint256 indexed tokenId, uint256 indexed huntId, address indexed winner);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error OnlyMinter();
    error AlreadyMintedForHunt();
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _owner)
        ERC721("Treasure Hunt Trophy", "TROPHY")
        Ownable(_owner)
    {}

    // ─────────────────────────────────────────────────────────────────────────
    // Minter management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Set the authorised minter (the TreasureHunt contract).
     *         Can only be called by owner. Usually called once after deployment.
     */
    function setMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) revert ZeroAddress();
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Mint a Treasure Trophy to the hunt winner.
     *         Called exclusively by the TreasureHunt contract.
     * @param winner     Address receiving the NFT.
     * @param huntId     The hunt ID this trophy belongs to.
     * @return tokenId   The newly minted token ID.
     */
    function mintWinner(address winner, uint256 huntId)
        external
        returns (uint256 tokenId)
    {
        if (msg.sender != minter) revert OnlyMinter();
        if (huntToToken[huntId] != 0) revert AlreadyMintedForHunt();

        unchecked { tokenId = ++_tokenIdCounter; }

        trophies[tokenId] = TrophyData({
            huntId:      huntId,
            winner:      winner,
            mintedAt:    block.timestamp,
            prizeAmount: 0,   // updated via updatePrize if needed
            huntTitle:   ""   // enriched off-chain / via setHuntTitle
        });

        huntToToken[huntId] = tokenId;
        playerTokens[winner].push(tokenId);

        _safeMint(winner, tokenId);
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        emit TrophyMinted(tokenId, huntId, winner);
    }

    /**
     * @notice Update the hunt title and prize amount for richer on-chain metadata.
     *         Only the minter (TreasureHunt contract) or owner can call.
     */
    function enrichMetadata(
        uint256 tokenId,
        string calldata huntTitle,
        uint256 prizeAmount
    ) external {
        if (msg.sender != minter && msg.sender != owner()) revert OnlyMinter();
        TrophyData storage t = trophies[tokenId];
        t.huntTitle  = huntTitle;
        t.prizeAmount = prizeAmount;
        // Rebuild and update URI
        _setTokenURI(tokenId, _buildTokenURI(tokenId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // On-chain metadata
    // ─────────────────────────────────────────────────────────────────────────

    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        TrophyData memory t = trophies[tokenId];

        string memory huntLabel = bytes(t.huntTitle).length > 0
            ? t.huntTitle
            : string(abi.encodePacked("Hunt #", t.huntId.toString()));

        string memory prizeLabel = t.prizeAmount > 0
            ? string(abi.encodePacked(_formatEth(t.prizeAmount), " ETH"))
            : "Undisclosed";

        // SVG image — dark cinematic treasure aesthetic
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<defs>',
            '<radialGradient id="bg" cx="50%" cy="50%" r="70%">',
            '<stop offset="0%" stop-color="#1a0a2e"/>',
            '<stop offset="100%" stop-color="#0d0618"/>',
            '</radialGradient>',
            '<radialGradient id="glow" cx="50%" cy="40%" r="40%">',
            '<stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3"/>',
            '<stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>',
            '</radialGradient>',
            '</defs>',
            '<rect width="400" height="400" fill="url(#bg)"/>',
            '<rect width="400" height="400" fill="url(#glow)"/>',
            '<circle cx="200" cy="155" r="60" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.6"/>',
            '<text x="200" y="170" font-family="serif" font-size="52" text-anchor="middle" fill="#f59e0b">&#x1F5DD;</text>',
            '<text x="200" y="250" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#e2e8f0" font-weight="bold">TREASURE HUNT WINNER</text>',
            '<text x="200" y="272" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#94a3b8">',
            _truncate(huntLabel, 32),
            '</text>',
            '<text x="200" y="300" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#f59e0b">Prize: ', prizeLabel, '</text>',
            '<text x="200" y="320" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#64748b">Token #', tokenId.toString(), ' | Hunt #', t.huntId.toString(), '</text>',
            '<text x="200" y="370" font-family="sans-serif" font-size="8" text-anchor="middle" fill="#334155">Internet Treasure Hunts</text>',
            '<rect x="10" y="10" width="380" height="380" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.3" rx="8"/>',
            '</svg>'
        ));

        string memory encodedSvg = string(
            abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg)))
        );

        string memory json = string(abi.encodePacked(
            '{"name":"Treasure Trophy #', tokenId.toString(), '",',
            '"description":"Awarded to the winner of ', _jsonEscape(huntLabel), ' on Internet Treasure Hunts.",',
            '"image":"', encodedSvg, '",',
            '"attributes":[',
            '{"trait_type":"Hunt","value":"', _jsonEscape(huntLabel), '"},',
            '{"trait_type":"Hunt ID","value":', t.huntId.toString(), '},',
            '{"trait_type":"Prize","value":"', prizeLabel, '"},',
            '{"trait_type":"Minted At","display_type":"date","value":', t.mintedAt.toString(), '}',
            ']}'
        ));

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _formatEth(uint256 wei_) internal pure returns (string memory) {
        // Simplified: show up to 4 decimal places
        uint256 eth    = wei_ / 1e18;
        uint256 frac   = (wei_ % 1e18) / 1e14; // 4 dp
        return string(abi.encodePacked(eth.toString(), ".", _pad4(frac)));
    }

    function _pad4(uint256 n) internal pure returns (string memory) {
        string memory s = n.toString();
        uint256 len = bytes(s).length;
        if (len >= 4) return s;
        string memory pad = "";
        for (uint256 i = len; i < 4; i++) pad = string(abi.encodePacked("0", pad));
        return string(abi.encodePacked(pad, s));
    }

    function _truncate(string memory s, uint256 maxLen) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        if (b.length <= maxLen) return s;
        bytes memory out = new bytes(maxLen);
        for (uint256 i = 0; i < maxLen; i++) out[i] = b[i];
        return string(abi.encodePacked(out, "..."));
    }

    function _jsonEscape(string memory s) internal pure returns (string memory) {
        // Basic escaping for double-quotes
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length * 2);
        uint256 j;
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == '"') { out[j++] = '\\'; }
            out[j++] = b[i];
        }
        bytes memory trimmed = new bytes(j);
        for (uint256 k = 0; k < j; k++) trimmed[k] = out[k];
        return string(trimmed);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    function getPlayerTokens(address player) external view returns (uint256[] memory) {
        return playerTokens[player];
    }

    function getTrophy(uint256 tokenId) external view returns (TrophyData memory) {
        return trophies[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Required overrides for multiple inheritance
    // ─────────────────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
