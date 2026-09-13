/**
 * ensSubnames.ts
 *
 * ENSv2 subname service for Internet Treasure Hunts.
 *
 * Namespace layout (all on Sepolia ENSv2 Beta):
 *   Platform:    treasurehunts.eth
 *   Brand:       {slug}.treasurehunts.eth          ← creator owns this
 *   Hunt:        hunt-{id}.{slug}.treasurehunts.eth ← brand registers per hunt
 *   AI Agent:    agent-{id}.{slug}.treasurehunts.eth ← auto-created with hunt
 *
 * Each subname points at a PermissionedResolverImpl where:
 *   - The brand wallet holds MANAGER_ROLE → can write any record
 *   - The AI agent address (if provided) holds WRITER_ROLE → can only setText
 *   - Hunt metadata (title, prize, status, difficulty, …) is stored as
 *     EIP-634 text records so it is publicly readable via any ENS resolver
 *
 * Write functions return { address, abi, functionName, args } objects — the
 * exact shape wagmi's writeContract / useWriteContract expects, so callers
 * don't need to know anything about the ABI directly.
 *
 * Read functions use a dedicated Sepolia viem public client so they work
 * regardless of which network the user's wallet is connected to.
 */

import { createPublicClient, http, encodeAbiParameters, parseAbiParameters, toHex } from 'viem'
import { packetToBytes } from 'viem/ens'
import { sepolia } from 'viem/chains'
import {
  ENSV2_SEPOLIA,
  ENSV2_NAMESPACE_REGISTRY,
  ENSV2_PERMISSIONED_RESOLVER,
  PLATFORM_ENS_NAME,
  REGISTRY_ABI,
  PERMISSIONED_RESOLVER_ABI,
  WRITER_ROLE,
  MANAGER_ROLE,
  toBrandSlug,
  huntLabel,
  agentLabel,
  huntSubname as makeHuntSubname,
  agentSubname as makeAgentSubname,
  brandName as makeBrandName,
  labelTokenId,
  expiryTimestamp,
  nameHash,
  TEXT_KEYS,
  type HuntENSMetadata,
  type BrandENSMetadata,
  type AgentENSMetadata,
} from '@/lib/ensv2'

function resolverAddress(): `0x${string}` {
  if (!ENSV2_PERMISSIONED_RESOLVER) {
    throw new Error('VITE_ENS_PERMISSIONED_RESOLVER must point to an initialized ENSv2 resolver proxy.')
  }
  return ENSV2_PERMISSIONED_RESOLVER
}

// ─────────────────────────────────────────────────────────────────────────────
// Dedicated Sepolia read client (ENSv2 lives on Sepolia, not mainnet)
// ─────────────────────────────────────────────────────────────────────────────

const sepoliaClient = createPublicClient({
  chain:     sepolia,
  transport: http(
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ENS_SEPOLIA_RPC_URL) ||
    'https://rpc.sepolia.org'
  ),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by all write helpers — passed directly to wagmi writeContract. */
export interface ContractWriteArgs {
  address:      `0x${string}`
  abi:          readonly unknown[]
  functionName: string
  args:         readonly unknown[]
  value?:       bigint
}

export interface SubnameRecord {
  label:        string
  fullName:     string
  node:         `0x${string}`
  owner:        string | null
  resolver:     string | null
  records:      Record<string, string>    // key → value text records
  exists:       boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Register brand namespace: {slug}.treasurehunts.eth
// ─────────────────────────────────────────────────────────────────────────────
//
// This calls ETHRegistry.register(label, owner, expiry, resolver).
// The platform must have previously given the brand permission (or the brand
// can own treasurehunts.eth itself on Sepolia for demo purposes).
//
// In the ETHRegistry, register() takes:
//   label    — the raw label (no dots), e.g. "mybrand"
//   owner    — brand's wallet address
//   expiry   — uint64 unix timestamp
//   resolver — PermissionedResolverImpl address
//
// After registering, the brand should call setResolver on the ETHRegistry to
// point their subname at a PermissionedResolverImpl, then optionally set text
// records via setText on that resolver.

export function buildRegisterBrandNamespace(
  brandName: string,
  ownerAddress: `0x${string}`,
): ContractWriteArgs {
  const slug = toBrandSlug(brandName)
  if (!ENSV2_NAMESPACE_REGISTRY) {
    throw new Error('VITE_ENS_NAMESPACE_REGISTRY must point to the UserRegistry mounted at treasurehunts.eth.')
  }

  return {
    address:      ENSV2_NAMESPACE_REGISTRY,
    abi:          REGISTRY_ABI,
    functionName: 'register',
    args: [
      slug,                                  // label
      ownerAddress,                          // owner
      '0x0000000000000000000000000000000000000000', // child registry
      resolverAddress(),                      // resolver proxy
      0n,                                    // initial role bitmap
      expiryTimestamp(2),                    // expiry: 2 years
    ],
  }
}

/** After registering, store brand metadata as text records on the resolver. */
export function buildSetBrandRecords(
  brandSlug: string,
  metadata: BrandENSMetadata,
): ContractWriteArgs[] {
  const node = nameHash(makeBrandName(brandSlug))

  const entries: [string, string][] = [
    [TEXT_KEYS.brandName,   metadata.brandName],
    [TEXT_KEYS.brandType,   metadata.brandType],
    [TEXT_KEYS.brandUrl,    metadata.brandUrl    ?? ''],
    [TEXT_KEYS.brandAvatar, metadata.brandAvatar ?? ''],
  ]

  return entries.map(([key, value]) => ({
    address:      resolverAddress(),
    abi:          PERMISSIONED_RESOLVER_ABI,
    functionName: 'setText',
    args:         [node, key, value],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Register hunt subname: hunt-{id}.{slug}.treasurehunts.eth
// ─────────────────────────────────────────────────────────────────────────────
//
// Caller is the brand — they own {slug}.treasurehunts.eth and can create
// subnames under it via the UserRegistryImpl (or the ETHRegistry if they
// haven't deployed their own registry yet).
//
// Flow:
//   a. Call ETHRegistry.register(huntLabel, owner, expiry, resolver)
//      on the brand's sub-registry (brandRegistryAddress), OR
//      call ETHRegistry.register directly if brand == platform owner.
//   b. Call PermissionedResolverImpl.setText(...) for each metadata field.
//   c. (Optional) Call grantRole(WRITER_ROLE, aiAgentAddress) so the AI
//      agent can update hunt.status when the hunt progresses on-chain.

export function buildRegisterHuntSubname(
  huntId:         string | number,
  brandSlug:      string,
  ownerAddress:   `0x${string}`,
  brandRegistry?: `0x${string}`,    // if brand has their own UserRegistry
): ContractWriteArgs {
  if (!brandRegistry) throw new Error('Register the brand namespace before creating hunt subnames.')
  const registry = brandRegistry

  return {
    address:      registry,
    abi:          REGISTRY_ABI,
    functionName: 'register',
    args: [
      huntLabel(huntId),                     // "hunt-42"
      ownerAddress,
      '0x0000000000000000000000000000000000000000',
      resolverAddress(),
      0n,
      expiryTimestamp(2),
    ],
  }
}

/** Set hunt metadata as text records on PermissionedResolverImpl. */
export function buildSetHuntRecords(
  huntId:    string | number,
  brandSlug: string,
  metadata:  HuntENSMetadata,
): ContractWriteArgs[] {
  const node = nameHash(makeHuntSubname(huntId, brandSlug))

  const entries: [string, string][] = [
    [TEXT_KEYS.huntId,         metadata.huntId],
    [TEXT_KEYS.huntTitle,      metadata.title],
    [TEXT_KEYS.huntPrize,      metadata.prize],
    [TEXT_KEYS.huntStatus,     metadata.status],
    [TEXT_KEYS.huntDifficulty, metadata.difficulty],
    [TEXT_KEYS.huntCategory,   metadata.category],
    [TEXT_KEYS.huntCreator,    metadata.creator],
    [TEXT_KEYS.huntCreatedAt,  metadata.createdAt],
    [TEXT_KEYS.huntIsAI,       String(metadata.isAiGenerated ?? false)],
  ]
  if (metadata.txHash) {
    entries.push([TEXT_KEYS.huntTxHash, metadata.txHash])
  }

  return entries.map(([key, value]) => ({
    address:      resolverAddress(),
    abi:          PERMISSIONED_RESOLVER_ABI,
    functionName: 'setText',
    args:         [node, key, value],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Register AI agent subname: agent-{id}.{slug}.treasurehunts.eth
// ─────────────────────────────────────────────────────────────────────────────
//
// Each AI-generated hunt gets its own agent subname with delegated permissions.
// The agent address (a burner or backend signer) is granted WRITER_ROLE on the
// hunt's PermissionedResolver, allowing it to update hunt.status and
// hunt.prize records automatically as the on-chain hunt progresses.

export function buildRegisterAgentSubname(
  huntId:         string | number,
  brandSlug:      string,
  ownerAddress:   `0x${string}`,
  agentAddress:   `0x${string}`,
  brandRegistry?: `0x${string}`,
): ContractWriteArgs[] {
  if (!brandRegistry) throw new Error('Register the brand namespace before creating agent subnames.')
  const registry = brandRegistry
  const huntNode = nameHash(makeHuntSubname(huntId, brandSlug))

  return [
    // 1. Register the agent subname
    {
      address:      registry,
      abi:          REGISTRY_ABI,
      functionName: 'register',
      args: [
        agentLabel(huntId),                    // "agent-42"
        ownerAddress,
        '0x0000000000000000000000000000000000000000',
        resolverAddress(),
        0n,
        expiryTimestamp(2),
      ],
    },
    // 2. Grant only the hunt.status text record. ENSv2 permissions are
    //    scoped by DNS name and record key, never global role strings.
    {
      address:      resolverAddress(),
      abi:          PERMISSIONED_RESOLVER_ABI,
      functionName: 'authorizeTextRoles',
      args: [toHex(packetToBytes(makeHuntSubname(huntId, brandSlug))), TEXT_KEYS.huntStatus, agentAddress, true],
    },
  ]
}

/** Set agent identity records on the agent subname's resolver node. */
export function buildSetAgentRecords(
  huntId:    string | number,
  brandSlug: string,
  metadata:  AgentENSMetadata,
): ContractWriteArgs[] {
  const node = nameHash(makeAgentSubname(huntId, brandSlug))

  const entries: [string, string][] = [
    [TEXT_KEYS.agentHuntId,      metadata.huntId],
    [TEXT_KEYS.agentVersion,     metadata.version],
    [TEXT_KEYS.agentModel,       metadata.model],
    [TEXT_KEYS.agentCreatedAt,   metadata.createdAt],
    [TEXT_KEYS.agentPermissions, metadata.permissions],
  ]

  return entries.map(([key, value]) => ({
    address:      resolverAddress(),
    abi:          PERMISSIONED_RESOLVER_ABI,
    functionName: 'setText',
    args:         [node, key, value],
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Live status update — called by the AI agent when hunt status changes on-chain
// ─────────────────────────────────────────────────────────────────────────────

export function buildUpdateHuntStatus(
  huntId:    string | number,
  brandSlug: string,
  status:    string,
  winner?:   string,
): ContractWriteArgs[] {
  const node = nameHash(makeHuntSubname(huntId, brandSlug))

  const writes: ContractWriteArgs[] = [{
    address:      resolverAddress(),
    abi:          PERMISSIONED_RESOLVER_ABI,
    functionName: 'setText',
    args:         [node, TEXT_KEYS.huntStatus, status],
  }]

  if (winner) {
    writes.push({
      address:      resolverAddress(),
      abi:          PERMISSIONED_RESOLVER_ABI,
      functionName: 'setText',
      args:         [node, 'hunt.winner', winner],
    })
  }

  return writes
}

// ─────────────────────────────────────────────────────────────────────────────
// Read — fetch resolver records for a subname
// ─────────────────────────────────────────────────────────────────────────────

const HUNT_READ_KEYS = [
  TEXT_KEYS.huntId, TEXT_KEYS.huntTitle, TEXT_KEYS.huntPrize,
  TEXT_KEYS.huntStatus, TEXT_KEYS.huntDifficulty, TEXT_KEYS.huntCategory,
  TEXT_KEYS.huntCreator, TEXT_KEYS.huntCreatedAt, TEXT_KEYS.huntTxHash,
  TEXT_KEYS.huntIsAI,
]

const BRAND_READ_KEYS = [
  TEXT_KEYS.brandName, TEXT_KEYS.brandType, TEXT_KEYS.brandUrl, TEXT_KEYS.brandAvatar,
]

const AGENT_READ_KEYS = [
  TEXT_KEYS.agentHuntId, TEXT_KEYS.agentVersion, TEXT_KEYS.agentModel,
  TEXT_KEYS.agentCreatedAt, TEXT_KEYS.agentPermissions,
]

async function readTextRecords(
  node:     `0x${string}`,
  keys:     string[],
  resolver: `0x${string}`,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  await Promise.allSettled(
    keys.map(async key => {
      try {
        const val = await sepoliaClient.readContract({
          address:      resolver,
          abi:          PERMISSIONED_RESOLVER_ABI,
          functionName: 'text',
          args:         [node, key],
        }) as string
        results[key] = val
      } catch {
        results[key] = ''
      }
    })
  )
  return results
}

export async function readHuntSubnameRecords(
  huntId:    string | number,
  brandSlug: string,
): Promise<SubnameRecord> {
  const fullName = makeHuntSubname(huntId, brandSlug)
  const node     = nameHash(fullName)

  let records: Record<string, string> = {}
  let exists = false

  try {
    records = await readTextRecords(node, HUNT_READ_KEYS, ENSV2_PERMISSIONED_RESOLVER)
    exists  = !!records[TEXT_KEYS.huntId]
  } catch { /* subname not registered yet */ }

  return {
    label:    huntLabel(huntId),
    fullName,
    node,
    owner:    null,   // would need ownerOf call on the registry
    resolver: ENSV2_PERMISSIONED_RESOLVER,
    records,
    exists,
  }
}

export async function readBrandSubnameRecords(
  brandSlug: string,
): Promise<SubnameRecord> {
  const fullName = makeBrandName(brandSlug)
  const node     = nameHash(fullName)

  let records: Record<string, string> = {}
  let exists = false

  try {
    records = await readTextRecords(node, BRAND_READ_KEYS, ENSV2_PERMISSIONED_RESOLVER)
    exists  = !!records[TEXT_KEYS.brandName]
  } catch { /* not registered */ }

  return {
    label:    brandSlug,
    fullName,
    node,
    owner:    null,
    resolver: ENSV2_PERMISSIONED_RESOLVER,
    records,
    exists,
  }
}

export async function readAgentSubnameRecords(
  huntId:    string | number,
  brandSlug: string,
): Promise<SubnameRecord> {
  const fullName = makeAgentSubname(huntId, brandSlug)
  const node     = nameHash(fullName)

  let records: Record<string, string> = {}
  let exists = false

  try {
    records = await readTextRecords(node, AGENT_READ_KEYS, ENSV2_PERMISSIONED_RESOLVER)
    exists  = !!records[TEXT_KEYS.agentHuntId]
  } catch { /* not registered */ }

  return {
    label:    agentLabel(huntId),
    fullName,
    node,
    owner:    null,
    resolver: ENSV2_PERMISSIONED_RESOLVER,
    records,
    exists,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: check if a label is already registered in the ETHRegistry
// ─────────────────────────────────────────────────────────────────────────────

export async function checkSubnameExists(label: string): Promise<boolean> {
  try {
    if (!ENSV2_NAMESPACE_REGISTRY) return false
    const subregistry = await sepoliaClient.readContract({
      address:      ENSV2_NAMESPACE_REGISTRY,
      abi:          REGISTRY_ABI,
      functionName: 'getSubregistry',
      args:         [labelTokenId(label)],
    }) as `0x${string}`

    // Returns zero address when not registered
    return subregistry !== '0x0000000000000000000000000000000000000000'
  } catch {
    return false
  }
}

/** Resolve the UserRegistry that owns a brand's children. */
export async function getBrandSubregistry(brandSlug: string): Promise<`0x${string}` | undefined> {
  if (!ENSV2_NAMESPACE_REGISTRY) return undefined
  try {
    const registry = await sepoliaClient.readContract({
      address: ENSV2_NAMESPACE_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'getSubregistry',
      args: [labelTokenId(brandSlug)],
    }) as `0x${string}`
    return registry === '0x0000000000000000000000000000000000000000' ? undefined : registry
  } catch {
    return undefined
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: check if an AI agent has WRITER_ROLE on a resolver node
// ─────────────────────────────────────────────────────────────────────────────

export async function checkAgentHasWriterRole(agentAddress: `0x${string}`): Promise<boolean> {
  try {
    return await sepoliaClient.readContract({
      address:      ENSV2_PERMISSIONED_RESOLVER || ENSV2_SEPOLIA.PermissionedResolverImpl,
      abi:          PERMISSIONED_RESOLVER_ABI,
      functionName: 'roles',
      args:         ['0x0000000000000000000000000000000000000000000000000000000000000000', agentAddress],
    }) as bigint > 0n
  } catch {
    return false
  }
}

// Re-export helpers the UI needs
export { toBrandSlug, huntLabel, agentLabel, PLATFORM_ENS_NAME }
export const huntSubname = makeHuntSubname
export const agentSubname = makeAgentSubname
export const brandFullName = makeBrandName
