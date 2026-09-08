// ─────────────────────────────────────────────────────────────────────────────
// Contract ABIs — hand-crafted from the Solidity source so no forge artifacts
// are needed at frontend build time. Keep in sync with TreasureHunt.sol +
// TreasureNFT.sol when the contracts change.
// ─────────────────────────────────────────────────────────────────────────────

export const TREASURE_HUNT_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  {
    name: 'getHunt',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'id',               type: 'uint256' },
        { name: 'creator',          type: 'address' },
        { name: 'answerHash',       type: 'bytes32' },
        { name: 'prize',            type: 'uint256' },
        { name: 'participantCount', type: 'uint256' },
        { name: 'correctCount',     type: 'uint256' },
        { name: 'createdAt',        type: 'uint256' },
        { name: 'endTime',          type: 'uint256' },
        { name: 'huntType',         type: 'uint8'   },
        { name: 'status',           type: 'uint8'   },
        { name: 'winner',           type: 'address' },
        { name: 'vrfRequestId',     type: 'uint256' },
        { name: 'prizeClaimed',     type: 'bool'    },
      ],
    }],
  },
  {
    name: 'huntCount',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCorrectSolvers',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getCorrectSolverCount',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'hasParticipated',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }, { name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'hasSolved',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }, { name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isExpired',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'platformFeePercent',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'feeRecipient',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address' }],
  },

  // ── Write ─────────────────────────────────────────────────────────────────
  {
    name: 'createHunt',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'answerHash', type: 'bytes32' },
      { name: 'huntType',   type: 'uint8'   },
      { name: 'endTime',    type: 'uint256' },
    ],
    outputs: [{ name: 'huntId', type: 'uint256' }],
  },
  {
    name: 'submitAnswer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'huntId',     type: 'uint256' },
      { name: 'answerHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'closeAndRequestDraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelHunt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [],
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: 'HuntCreated',
    type: 'event',
    inputs: [
      { name: 'huntId',   type: 'uint256', indexed: true  },
      { name: 'creator',  type: 'address', indexed: true  },
      { name: 'huntType', type: 'uint8',   indexed: false },
      { name: 'prize',    type: 'uint256', indexed: false },
      { name: 'endTime',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'HuntParticipated',
    type: 'event',
    inputs: [
      { name: 'huntId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    name: 'CorrectSolution',
    type: 'event',
    inputs: [
      { name: 'huntId',   type: 'uint256', indexed: true  },
      { name: 'player',   type: 'address', indexed: true  },
      { name: 'position', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'IncorrectSolution',
    type: 'event',
    inputs: [
      { name: 'huntId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
    ],
  },
  {
    name: 'HuntSolved',
    type: 'event',
    inputs: [
      { name: 'huntId', type: 'uint256', indexed: true  },
      { name: 'winner', type: 'address', indexed: true  },
      { name: 'prize',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RandomnessRequested',
    type: 'event',
    inputs: [
      { name: 'huntId',    type: 'uint256', indexed: true },
      { name: 'requestId', type: 'uint256', indexed: true },
    ],
  },
  {
    name: 'WinnerSelected',
    type: 'event',
    inputs: [
      { name: 'huntId',      type: 'uint256', indexed: true  },
      { name: 'winner',      type: 'address', indexed: true  },
      { name: 'randomWord',  type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PrizeClaimed',
    type: 'event',
    inputs: [
      { name: 'huntId', type: 'uint256', indexed: true  },
      { name: 'winner', type: 'address', indexed: true  },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'NFTMinted',
    type: 'event',
    inputs: [
      { name: 'huntId',  type: 'uint256', indexed: true },
      { name: 'winner',  type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'HuntClosed',
    type: 'event',
    inputs: [{ name: 'huntId', type: 'uint256', indexed: true }],
  },
  {
    name: 'HuntCancelled',
    type: 'event',
    inputs: [{ name: 'huntId', type: 'uint256', indexed: true }],
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// TreasureNFT ABI
// ─────────────────────────────────────────────────────────────────────────────
export const TREASURE_NFT_ABI = [
  // Read
  {
    name: 'getTrophy',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple',
      components: [
        { name: 'huntId',      type: 'uint256' },
        { name: 'winner',      type: 'address' },
        { name: 'mintedAt',    type: 'uint256' },
        { name: 'prizeAmount', type: 'uint256' },
        { name: 'huntTitle',   type: 'string'  },
      ],
    }],
  },
  {
    name: 'getPlayerTokens',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'huntToToken',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'huntId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalMinted',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'minter',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Events
  {
    name: 'TrophyMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'huntId',  type: 'uint256', indexed: true },
      { name: 'winner',  type: 'address', indexed: true },
    ],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from',    type: 'address', indexed: true },
      { name: 'to',      type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const
