import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

/**
 * ENS resolution always uses mainnet — ENS registry lives on L1.
 * We keep a dedicated client separate from the app's wagmi chain
 * so ENS names work regardless of which testnet the user is on.
 */
const ensClient = createPublicClient({
  chain:     mainnet,
  transport: http(import.meta.env.VITE_ENS_RPC_URL || 'https://eth.llamarpc.com'),
})

// Simple in-process cache — avoids repeated RPC calls for the same address
const nameCache  = new Map<string, string | null>()
const addrCache  = new Map<string, string | null>()
const avatarCache = new Map<string, string | null>()

const CACHE_TTL = 10 * 60 * 1000 // 10 min
const cacheTs   = new Map<string, number>()

function isFresh(key: string): boolean {
  return Date.now() - (cacheTs.get(key) ?? 0) < CACHE_TTL
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve address → ENS name
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveENSName(address: string): Promise<string | null> {
  const key = `name:${address.toLowerCase()}`
  if (nameCache.has(key) && isFresh(key)) return nameCache.get(key)!

  try {
    const name = await ensClient.getEnsName({ address: address as `0x${string}` })
    nameCache.set(key, name ?? null)
    cacheTs.set(key, Date.now())
    return name ?? null
  } catch {
    nameCache.set(key, null)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve ENS name → address
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveENSAddress(name: string): Promise<string | null> {
  const key = `addr:${name.toLowerCase()}`
  if (addrCache.has(key) && isFresh(key)) return addrCache.get(key)!

  try {
    const address = await ensClient.getEnsAddress({ name })
    addrCache.set(key, address ?? null)
    cacheTs.set(key, Date.now())
    return address ?? null
  } catch {
    addrCache.set(key, null)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve ENS avatar
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveENSAvatar(nameOrAddress: string): Promise<string | null> {
  const key = `avatar:${nameOrAddress.toLowerCase()}`
  if (avatarCache.has(key) && isFresh(key)) return avatarCache.get(key)!

  try {
    // If it looks like an address, resolve name first
    let name = nameOrAddress
    if (nameOrAddress.startsWith('0x')) {
      name = (await resolveENSName(nameOrAddress)) ?? nameOrAddress
    }
    const avatar = await ensClient.getEnsAvatar({ name })
    avatarCache.set(key, avatar ?? null)
    cacheTs.set(key, Date.now())
    return avatar ?? null
  } catch {
    avatarCache.set(key, null)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch resolve multiple addresses
// ─────────────────────────────────────────────────────────────────────────────

export async function batchResolveENS(
  addresses: string[]
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}
  await Promise.allSettled(
    addresses.map(async addr => {
      results[addr] = await resolveENSName(addr)
    })
  )
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Format: show ENS name if available, else short address
// ─────────────────────────────────────────────────────────────────────────────

export function formatIdentity(address: string, ensName: string | null | undefined): string {
  if (ensName) return ensName
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
