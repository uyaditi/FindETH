import { Difficulty, HuntStatus, HuntType, type Hunt } from '@/types'

/**
 * Demo hunts used when subgraph / chain data is unavailable.
 * The `id` field matches the on-chain seed from SeedLocal.s.sol.
 */
export const DEMO_HUNTS: Hunt[] = [
  // ── Hunt 1 — THE LOST ETHEREUM ──────────────────────────────────────────
  {
    id:          '1',
    onChainId:   1n,
    title:       'The Lost Ethereum',
    description: 'Somewhere in the ancient internet, a mysterious message was hidden at the dawn of cryptocurrency. Follow the clues through blockchain history to uncover the forgotten word.',
    story:       'In 2009, a message was embedded in the very first block. A visionary knew the world would change forever. They left clues scattered across the early web — but only the most curious will find the answer.',
    difficulty:  Difficulty.Medium,
    category:    'Blockchain',
    tags:        ['ethereum', 'history', 'mystery'],
    huntType:    HuntType.Race,
    status:      HuntStatus.Active,
    prize:       50000000000000000n, // 0.05 ETH
    creator:     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    creatorEns:  'treasuremaster.eth',
    participantCount: 284,
    correctCount: 0,
    createdAt:   Math.floor(Date.now() / 1000) - 86400,
    endTime:     Math.floor(Date.now() / 1000) + 6 * 86400,
    clues: [
      {
        id: '1-1', order: 1,
        text: '"In the beginning, there was a message. Find the first transaction\'s hidden words."',
        hint: 'Think about the genesis block.',
        answer: 'genesis',
        location: { url: 'https://etherscan.io', page: 'Block 0', section: 'Extra Data', label: 'Genesis Block' },
      },
      {
        id: '1-2', order: 2,
        text: '"The architect signed his last goodbye. What name did the world know him by?"',
        hint: 'The pseudonymous creator of Bitcoin.',
        answer: 'satoshi',
        location: { url: 'https://bitcoin.org', page: 'About', section: 'Creator', label: 'Bitcoin.org' },
      },
      {
        id: '1-3', order: 3,
        text: '"Where transactions become truth, and truth becomes permanent. What do we call this ledger?"',
        hint: 'The technology, not the coin.',
        answer: 'blockchain',
        location: { url: 'https://ethereum.org', page: 'What is Ethereum', section: 'Technology', label: 'Ethereum.org' },
      },
    ],
    isBusiness: false,
    isAiGenerated: false,
  },

  // ── Hunt 2 — THE MYSTERY OF THE GOLDEN BLOCK ────────────────────────────
  {
    id:          '2',
    onChainId:   2n,
    title:       'The Mystery of the Golden Block',
    description: 'Deep in the cryptographic vaults of the internet lies the secret of the golden block. Only those who understand the language of distributed systems will unlock it.',
    story:       'A legendary figure disappeared after embedding a final clue across the decentralised web. Thousands searched. None succeeded. The trail runs cold — until now.',
    difficulty:  Difficulty.Hard,
    category:    'Blockchain',
    tags:        ['defi', 'cryptography', 'mystery', 'blockchain'],
    huntType:    HuntType.MysteryDraw,
    status:      HuntStatus.Active,
    prize:       100000000000000000n, // 0.10 ETH
    creator:     '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    creatorEns:  'cryptolore.eth',
    participantCount: 742,
    correctCount: 127,
    createdAt:   Math.floor(Date.now() / 1000) - 2 * 86400,
    endTime:     Math.floor(Date.now() / 1000) + 1 * 86400,
    clues: [
      {
        id: '2-1', order: 1,
        text: '"I am the agreement that needs no handshake, the contract that needs no courthouse. What am I?"',
        hint: 'Vitalik built the platform for them.',
        answer: 'smart contract',
        location: { url: 'https://ethereum.org', page: 'Developers', section: 'Smart Contracts', label: 'Ethereum Docs' },
      },
      {
        id: '2-2', order: 2,
        text: '"I live between chains, moving value across impossible distances. Find my full name."',
        hint: 'Bridges connect blockchains.',
        answer: 'bridge',
        location: { url: 'https://ethereum.org', page: 'Bridges', section: 'Overview', label: 'Ethereum L2' },
      },
      {
        id: '2-3', order: 3,
        text: '"Randomness is precious in a deterministic world. Who provides it fairly?"',
        hint: 'A well-known oracle network.',
        answer: 'chainlink',
        location: { url: 'https://chain.link', page: 'VRF', section: 'Introduction', label: 'Chainlink VRF' },
      },
    ],
    isBusiness: false,
    isAiGenerated: false,
  },

  // ── Hunt 3 — LINEN & CO. THE SUMMER SECRET ──────────────────────────────
  {
    id:          '3',
    onChainId:   3n,
    title:       'The Summer Secret',
    description: 'Linen & Co. hid a secret across their Summer Collection. Follow the fabric trail through product pages, stories, and inspiration to discover the final word.',
    story:       'Our Summer Collection tells a story. A story of nature, texture, and sun-warmed afternoons. We\'ve hidden clues inside the collection itself. Find them all and you\'ll discover our secret — and a reward.',
    difficulty:  Difficulty.Easy,
    category:    'Fashion',
    tags:        ['fashion', 'linen', 'summer', 'lifestyle'],
    huntType:    HuntType.MysteryDraw,
    status:      HuntStatus.Active,
    prize:       50000000000000000n, // 0.05 ETH
    creator:     '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    creatorEns:  'linenco.eth',
    participantCount: 183,
    correctCount: 42,
    createdAt:   Math.floor(Date.now() / 1000) - 3 * 86400,
    endTime:     Math.floor(Date.now() / 1000) + 4 * 86400,
    isBusiness: true,
    businessName: 'Linen & Co.',
    businessLogo: '🧵',
    businessAccent: '#d97706',
    isAiGenerated: true,
    aiConfidence: 0.91,
    clues: [
      {
        id: '3-1', order: 1,
        text: '"Nature\'s creation has always inspired us. Find the word that represents this in our Linen collection."',
        hint: 'It\'s the name of a natural fibre.',
        answer: 'linen',
        location: { url: 'https://example.com/linen', page: 'Linen Collection', section: 'Introduction', label: 'Collection Page' },
        placementInstruction: 'Insert after the first paragraph of the Linen Collection introduction.',
        reason: 'This is the gateway clue. Players naturally land on the collection page first.',
        merchantAction: 'Copy the clue text and insert it after the opening paragraph on the Linen Collection page.',
        locationFound: true,
      },
      {
        id: '3-2', order: 2,
        text: '"Soft enough for summer, strong enough to last. Find us where the story of our craft is told."',
        hint: 'Where do brands share their origins?',
        answer: 'origin',
        location: { url: 'https://example.com/about', page: 'About Us', section: 'Our Story', label: 'About Page' },
        placementInstruction: 'Insert after the founding story paragraph in the About Us page.',
        reason: 'The About Us page deepens engagement with the brand narrative.',
        merchantAction: 'Add the clue as a styled quote block after "Our founding story" section.',
        locationFound: true,
      },
      {
        id: '3-3', order: 3,
        text: '"The sun bleached coastlines gave birth to our palette. What season inspires this collection?"',
        hint: 'Check the collection name.',
        answer: 'summer',
        location: { url: 'https://example.com/summer', page: 'Summer Collection', section: 'Hero', label: 'Summer Collection' },
        placementInstruction: 'Embed in the hero section below the season tagline.',
        reason: 'Drives players back to the collection page — reinforces the campaign.',
        merchantAction: 'Add the clue below the season tagline in the Summer Collection hero banner.',
        locationFound: true,
      },
    ],
  },
]

export const DEMO_HUNT_MAP = Object.fromEntries(DEMO_HUNTS.map(h => [h.id, h]))

export function getDemoHunt(id: string): Hunt | undefined {
  return DEMO_HUNT_MAP[id]
}
