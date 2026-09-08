import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { useMemo } from 'react'
import { TREASURE_NFT_ABI } from '@/contracts/abis'
import { getAddresses } from '@/contracts/addresses'
import type { Trophy } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// usePlayerTrophies — load all NFT trophies owned by a player
// ─────────────────────────────────────────────────────────────────────────────

export function usePlayerTrophies(playerAddress: `0x${string}` | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  // Get all token IDs for this player
  const { data: tokenIds, isLoading: idsLoading } = useReadContract({
    address:      addresses.TREASURE_NFT,
    abi:          TREASURE_NFT_ABI,
    functionName: 'getPlayerTokens',
    args:         playerAddress ? [playerAddress] : undefined,
    query:        { enabled: !!playerAddress, staleTime: 30_000 },
  })

  const ids = (tokenIds as bigint[]) ?? []

  // Batch-read trophy data for each token
  const { data: trophyData, isLoading: trophiesLoading } = useReadContracts({
    contracts: ids.map(id => ({
      address:      addresses.TREASURE_NFT,
      abi:          TREASURE_NFT_ABI,
      functionName: 'getTrophy' as const,
      args:         [id] as [bigint],
    })),
    query: { enabled: ids.length > 0, staleTime: 60_000 },
  })

  const trophies = useMemo<Trophy[]>(() => {
    if (!trophyData) return []
    return ids.map((tokenId, i) => {
      const data = trophyData[i]?.result as {
        huntId: bigint; winner: string; mintedAt: bigint; prizeAmount: bigint; huntTitle: string
      } | undefined
      if (!data) return null
      return {
        tokenId,
        huntId:      data.huntId,
        winner:      data.winner,
        mintedAt:    data.mintedAt,
        prizeAmount: data.prizeAmount,
        huntTitle:   data.huntTitle,
      } satisfies Trophy
    }).filter(Boolean) as Trophy[]
  }, [ids, trophyData])

  return {
    trophies,
    tokenCount: ids.length,
    isLoading: idsLoading || trophiesLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNFTBalance — quick balance check
// ─────────────────────────────────────────────────────────────────────────────

export function useNFTBalance(playerAddress: `0x${string}` | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  const { data } = useReadContract({
    address:      addresses.TREASURE_NFT,
    abi:          TREASURE_NFT_ABI,
    functionName: 'balanceOf',
    args:         playerAddress ? [playerAddress] : undefined,
    query:        { enabled: !!playerAddress, staleTime: 30_000 },
  })

  return Number(data ?? 0n)
}

// ─────────────────────────────────────────────────────────────────────────────
// useHuntNFT — get the trophy token for a specific hunt
// ─────────────────────────────────────────────────────────────────────────────

export function useHuntNFT(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data: tokenId } = useReadContract({
    address:      addresses.TREASURE_NFT,
    abi:          TREASURE_NFT_ABI,
    functionName: 'huntToToken',
    args:         id ? [id] : undefined,
    query:        { enabled: !!id, staleTime: 30_000 },
  })

  const hasNFT = tokenId !== undefined && tokenId > 0n

  const { data: trophy } = useReadContract({
    address:      addresses.TREASURE_NFT,
    abi:          TREASURE_NFT_ABI,
    functionName: 'getTrophy',
    args:         tokenId && tokenId > 0n ? [tokenId as bigint] : undefined,
    query:        { enabled: hasNFT, staleTime: 60_000 },
  })

  const { data: tokenUri } = useReadContract({
    address:      addresses.TREASURE_NFT,
    abi:          TREASURE_NFT_ABI,
    functionName: 'tokenURI',
    args:         tokenId && tokenId > 0n ? [tokenId as bigint] : undefined,
    query:        { enabled: hasNFT, staleTime: 3_600_000 },
  })

  return {
    tokenId: tokenId as bigint | undefined,
    trophy:  trophy as { huntId: bigint; winner: string; mintedAt: bigint; prizeAmount: bigint; huntTitle: string } | undefined,
    tokenUri: tokenUri as string | undefined,
    hasNFT,
  }
}
