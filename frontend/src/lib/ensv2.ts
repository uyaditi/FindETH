/**
 * ENSv2 Sepolia Beta — contract addresses, minimal ABIs, and pure helpers.
 *
 * ENSv2 architecture used here:
 *   RootRegistry (ETHRegistry) — the .eth top-level registry on Sepolia
 *   UserRegistryImpl   — per-name registry each brand deploys for subnames
 *   PermissionedResolverImpl — resolver where creator/AI agent can write
 *                              specific records under access-controlled roles
 *   PublicResolverV2   — default resolver for reading text/addr records
 *
 * Namespace layout for Internet Treasure Hunts:
 *   Platform parent:   treasurehunts.eth           (owned by platform deployer)
 *   Brand namespace:   {brand}.treasurehunts.eth   (owned by brand wallet)
 *   Hunt subname:      hunt-{id}.{brand}.treasurehunts.eth
 *   AI agent subname:  agent-{id}.{brand}.treasurehunts.eth
 *
 * Sources:
 *   https://docs.ens.domains/learn/deployments/  (ENSv2 Beta Sepolia addresses)
 *   https://docs.ens.eth.limo/contracts/ensv2/overview
 */

import { keccak256, encodePacked, labelhash as viemLabelhash, namehash as viemNamehash } from 'viem'

// ─────────────────────────────────────────────────────────────────────────────
// ENSv2 Sepolia Beta contract addresses
// Source: https://docs.ens.domains/learn/deployments/
// ─────────────────────────────────────────────────────────────────────────────

export const ENSV2_SEPOLIA = {
  // Core registry — the root of all ENSv2 names on Sepolia
  RootRegistry:             '0x8115186e8f2e0b0281e86ab91f0f48ba90364354' as `0x${string}`,

  // ETH-specific registry (.eth names live here)
  ETHRegistry:              '0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2' as `0x${string}`,

  // Per-name user registry implementation — cloned for each brand namespace
  UserRegistryImpl:         '0x624a25d67b59d587752ebec8dded8827dae52050' as `0x${string}`,

  // PermissionedResolver — allows per-role record writes (ENSv2 access control)
  PermissionedResolverImpl: '0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e' as `0x${string}`,

  // Public resolver for standard text/addr records
  PublicResolverV2:         '0xe7b9a25607e02da8145e4eb1836ca539e53f11f7' as `0x${string}`,

  // Universal Resolver (upgradeable proxy) — entry point for all resolution
  UniversalResolver:        '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe' as `0x${string}`,

  // VerifiableFactory — used to deploy per-brand UserRegistry instances
  VerifiableFactory:        '0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef' as `0x${string}`,

  // ENSv2 native resolver (for upgraded names)
  ENSV2Resolver:            '0x508cb4e4596429ca98a1bb3112d88d18f92456b5' as `0x${string}`,
} as const

// This must be the UserRegistry mounted at treasurehunts.eth. ENSv2 is
// hierarchical: registering a label in ETHRegistry would create brand.eth,
// not brand.treasurehunts.eth.
export const ENSV2_NAMESPACE_REGISTRY = (
  import.meta.env.VITE_ENS_NAMESPACE_REGISTRY || ''
) as `0x${string}`

// A resolver implementation cannot hold records. This must be an initialized
// per-account resolver proxy deployed through the ENSv2 VerifiableFactory.
export const ENSV2_PERMISSIONED_RESOLVER = (
  import.meta.env.VITE_ENS_PERMISSIONED_RESOLVER || ''
) as `0x${string}`

// The platform parent name — brands get subnames under this
export const PLATFORM_ENS_NAME    = 'treasurehunts.eth'
export const PLATFORM_ENS_LABEL   = 'treasurehunts'

// ─────────────────────────────────────────────────────────────────────────────
// Minimal ABIs — only the functions this project actually calls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ETHRegistry / UserRegistryImpl
 * ENSv2 registries are ERC-1155 token contracts with hierarchical ownership.
 * setSubregistry — assign a child registry to a subname node
 * setResolver    — point a subname at a resolver
 * setOwner       — transfer subname ownership
 * register       — create a new subname with its child registry, resolver,
 *                  initial role bitmap, and expiry
 */
export const REGISTRY_ABI = [
  // Create / update a subname
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'label',    type: 'string'  },
      { name: 'owner',    type: 'address' },
      { name: 'registry', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'roleBitmap', type: 'uint256' },
      { name: 'expiry',   type: 'uint64'  },
    ],
    outputs: [{ type: 'uint256' }],
  },
  // Set the child registry for a subname
  {
    name: 'setSubregistry',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId',     type: 'uint256' },
      { name: 'subregistry', type: 'address' },
    ],
    outputs: [],
  },
  // Set resolver for a subname
  {
    name: 'setResolver',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId',  type: 'uint256' },
      { name: 'resolver', type: 'address' },
    ],
    outputs: [],
  },
  // Check subname owner
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  // Read subregistry
  {
    name: 'getSubregistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'anyId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
] as const

/**
 * PermissionedResolverImpl
 * ENSv2-native resolver with role-based write access.
 * Roles: OWNER_ROLE can grant WRITER_ROLE to AI agents.
 * WRITER_ROLE can setText/setAddr for their specific node only.
 */
export const PERMISSIONED_RESOLVER_ABI = [
  // Standard EIP-137 resolver interface
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key',  type: 'string'  },
      { name: 'value',type: 'string'  },
    ],
    outputs: [],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key',  type: 'string'  },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node',    type: 'bytes32' },
      { name: 'coinType',type: 'uint256' },
      { name: 'a',       type: 'bytes'   },
    ],
    outputs: [],
  },
  // addr(bytes32) — ETH address (coinType 60)
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
  },
  // ENSv2 PermissionedResolver scoped text permissions
  {
    name: 'authorizeTextRoles',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'toName',  type: 'bytes' },
      { name: 'key',     type: 'string' },
      { name: 'account', type: 'address' },
      { name: 'grant',   type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'roles',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'resource', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

/**
 * UniversalResolverV2 — read text/addr from any ENSv2 name via a single call
 */
export const UNIVERSAL_RESOLVER_ABI = [
  {
    name: 'resolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'bytes'  },
      { name: 'data', type: 'bytes'  },
    ],
    outputs: [
      { name: 'result',   type: 'bytes'   },
      { name: 'resolver', type: 'address' },
    ],
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Role constants (keccak256 of role name strings)
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_SET_TEXT = 1n << 4n
export const WRITER_ROLE  = ROLE_SET_TEXT
export const MANAGER_ROLE = ROLE_SET_TEXT
export const INITIAL_OWNER_ROLE_BITMAP = (1n << 20n) | (1n << 24n)
export const ADMIN_ROLE   = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

/** labelhash — keccak256 of a single DNS label (no dots). */
export function labelHash(label: string): `0x${string}` {
  return viemLabelhash(label)
}

/** namehash — ENS namehash (EIP-137) for a full name like "foo.bar.eth". */
export function nameHash(name: string): `0x${string}` {
  return viemNamehash(name)
}

/** Slugify a brand name for use as an ENS label (lowercase, hyphens, no dots). */
export function toBrandSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')   // replace illegal chars with hyphen
    .replace(/-+/g, '-')            // collapse consecutive hyphens
    .replace(/^-|-$/g, '')          // strip leading/trailing hyphens
    .slice(0, 32)                   // ENS label max length
}

/** Subname label for a hunt: hunt-{id} */
export function huntLabel(huntId: string | number): string {
  return `hunt-${huntId}`
}

/** Subname label for an AI agent: agent-{id} */
export function agentLabel(huntId: string | number): string {
  return `agent-${huntId}`
}

/** Full ENS name for a brand namespace. */
export function brandName(brandSlug: string): string {
  return `${brandSlug}.${PLATFORM_ENS_NAME}`
}

/** Full ENS name for a hunt subname. */
export function huntSubname(huntId: string | number, brandSlug: string): string {
  return `${huntLabel(huntId)}.${brandSlug}.${PLATFORM_ENS_NAME}`
}

/** Full ENS name for an AI agent subname. */
export function agentSubname(huntId: string | number, brandSlug: string): string {
  return `${agentLabel(huntId)}.${brandSlug}.${PLATFORM_ENS_NAME}`
}

/**
 * tokenId for a label in a UserRegistry.
 * ENSv2 UserRegistryImpl uses uint256(labelhash(label)) as the ERC-1155 token ID.
 */
export function labelTokenId(label: string): bigint {
  return BigInt(labelHash(label))
}

/**
 * Expiry timestamp: current time + N years (in seconds, as uint64).
 * Default: 2 years from now.
 */
export function expiryTimestamp(years = 2): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + years * 365 * 24 * 3600)
}

// ─────────────────────────────────────────────────────────────────────────────
// Text record keys — what we store on the PermissionedResolver
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_KEYS = {
  // Brand namespace records
  brandName:    'brand.name',
  brandType:    'brand.type',
  brandUrl:     'url',
  brandAvatar:  'avatar',

  // Hunt subname records
  huntId:       'hunt.id',
  huntTitle:    'hunt.title',
  huntPrize:    'hunt.prize',
  huntStatus:   'hunt.status',
  huntDifficulty: 'hunt.difficulty',
  huntCategory: 'hunt.category',
  huntCreator:  'hunt.creator',
  huntCreatedAt:'hunt.createdAt',
  huntTxHash:   'hunt.txHash',
  huntIsAI:     'hunt.isAiGenerated',

  // AI agent subname records
  agentHuntId:  'agent.huntId',
  agentVersion: 'agent.version',
  agentModel:   'agent.model',
  agentCreatedAt: 'agent.createdAt',
  agentPermissions: 'agent.permissions',
} as const

export type TextKey = typeof TEXT_KEYS[keyof typeof TEXT_KEYS]

// ─────────────────────────────────────────────────────────────────────────────
// Hunt metadata shape stored in ENSv2 resolver records
// ─────────────────────────────────────────────────────────────────────────────

export interface HuntENSMetadata {
  huntId:      string
  title:       string
  prize:       string     // ETH string, e.g. "0.05"
  status:      string     // "Active" | "Solved" | "Closed" | "Cancelled"
  difficulty:  string
  category:    string
  creator:     string     // 0x address
  createdAt:   string     // ISO timestamp
  txHash?:     string
  isAiGenerated?: boolean
}

export interface BrandENSMetadata {
  brandName:   string
  brandType:   string
  brandUrl?:   string
  brandAvatar?:string
}

export interface AgentENSMetadata {
  huntId:      string
  version:     string     // e.g. "gemini-2.5-flash"
  model:       string
  createdAt:   string
  permissions: string     // comma-separated: "setText,setAddr"
}
