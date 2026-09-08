import { anvil, sepolia } from '@/lib/wagmi'

// ─────────────────────────────────────────────────────────────────────────────
// Contract addresses per chain.
// Override via environment variables (set in .env.local after deployment).
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractAddresses {
  TREASURE_HUNT: `0x${string}`
  TREASURE_NFT:  `0x${string}`
}

// Anvil default: first contract deployed by first Anvil account
const ANVIL_ADDRESSES: ContractAddresses = {
  TREASURE_HUNT: (import.meta.env.VITE_TREASURE_HUNT_CONTRACT || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`,
  TREASURE_NFT:  (import.meta.env.VITE_TREASURE_NFT_CONTRACT  || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`,
}

const SEPOLIA_ADDRESSES: ContractAddresses = {
  TREASURE_HUNT: (import.meta.env.VITE_TREASURE_HUNT_CONTRACT || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  TREASURE_NFT:  (import.meta.env.VITE_TREASURE_NFT_CONTRACT  || '0x0000000000000000000000000000000000000000') as `0x${string}`,
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  [anvil.id]:   ANVIL_ADDRESSES,
  [sepolia.id]: SEPOLIA_ADDRESSES,
}

export function getAddresses(chainId: number): ContractAddresses {
  return CONTRACT_ADDRESSES[chainId] ?? ANVIL_ADDRESSES
}
