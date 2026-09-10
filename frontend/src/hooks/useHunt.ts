import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TREASURE_HUNT_ABI } from '@/contracts/abis'
import { getAddresses } from '@/contracts/addresses'
import { HuntStatus, HuntType, type Hunt, Difficulty } from '@/types'
import { DEMO_HUNTS, getDemoHunt } from '@/data/demoHunts'
import { useSubgraphHunts } from './useSubgraph'
import { getHuntMetadata, getAllHuntMetadata, type HuntMetadata } from '@/lib/huntMetadata'

// ─────────────────────────────────────────────────────────────────────────────
// useHunt — load a single hunt by ID
// Falls back to demo data when contract is unavailable
// ─────────────────────────────────────────────────────────────────────────────

export function useHunt(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data: onChain, isLoading, isError } = useReadContract({
    address:      addresses.TREASURE_HUNT,
    abi:          TREASURE_HUNT_ABI,
    functionName: 'getHunt',
    args:         id ? [id] : undefined,
    query:        { enabled: !!id, staleTime: 10_000 },
  })

  // Fetch metadata from API
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['hunt-metadata', huntId],
    queryFn: async () => {
      if (!huntId) return null
      return await getHuntMetadata(huntId)
    },
    enabled: !!huntId,
    staleTime: 30_000,
    retry: false,
  })

  const hunt = useMemo<Hunt | undefined>(() => {
    if (!huntId) return undefined

    // Prefer on-chain data
    if (onChain && onChain.id > 0n) {
      return {
        id:               huntId,
        onChainId:        onChain.id,
        creator:          onChain.creator,
        clueCount:        onChain.clueCount,
        prize:            onChain.prize,
        participantCount: Number(onChain.participantCount),
        correctCount:     Number(onChain.correctCount),
        createdAt:        Number(onChain.createdAt),
        endTime:          Number(onChain.endTime) || undefined,
        huntType:         onChain.huntType as HuntType,
        status:           onChain.status as HuntStatus,
        winner:           onChain.winner !== '0x0000000000000000000000000000000000000000'
                            ? onChain.winner : undefined,
        vrfRequestId:     onChain.vrfRequestId,
        prizeClaimed:     onChain.prizeClaimed,
        // Use metadata from API if available
        title:            metadata?.title || `Hunt #${huntId}`,
        description:      metadata?.description || `A treasure hunt with ${(Number(onChain.prize) / 1e18).toFixed(4)} ETH prize`,
        story:            metadata?.story,
        difficulty:       metadata?.difficulty ?? Difficulty.Medium,
        category:         metadata?.category,
        tags:             metadata?.tags,
        clues:            metadata?.clues?.map(c => ({
                            id:       `${c.order}`,
                            order:    c.order,
                            text:     c.text,
                            hint:     c.hint,
                            location: { url: c.url, page: c.page, section: c.section, label: c.label },
                          })) ?? [],
        isBusiness:       metadata?.isBusiness,
        businessName:     metadata?.businessName,
        businessLogo:     metadata?.businessLogo,
        businessAccent:   metadata?.businessAccent,
        isAiGenerated:    metadata?.isAiGenerated,
        aiConfidence:     metadata?.aiConfidence,
      } as Hunt
    }

    // Fallback to demo only if no on-chain data
    return getDemoHunt(huntId)
  }, [onChain, metadata, huntId])

  return { hunt, isLoading: isLoading || metadataLoading, isError }
}

// ─────────────────────────────────────────────────────────────────────────────
// useHunts — load multiple hunts (explore page)
// ─────────────────────────────────────────────────────────────────────────────

export function useHunts() {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  // Total hunt count from contract
  const { data: count } = useReadContract({
    address:      addresses.TREASURE_HUNT,
    abi:          TREASURE_HUNT_ABI,
    functionName: 'huntCount',
    query:        { staleTime: 15_000 },
  })

  // Also pull from subgraph for richer data
  const { hunts: subgraphHunts, isLoading: sgLoading } = useSubgraphHunts()

  // Read hunts directly from blockchain if subgraph is empty
  const huntCount = count ? Number(count) : 0

  // Build contract calls for all hunts
  const contracts = useMemo(() => {
    if (!huntCount) return []
    return Array.from({ length: huntCount }, (_, i) => ({
      address:      addresses.TREASURE_HUNT,
      abi:          TREASURE_HUNT_ABI,
      functionName: 'getHunt' as const,
      args:         [BigInt(i + 1)],
    }))
  }, [huntCount, addresses.TREASURE_HUNT])

  const { data: onChainHunts, isLoading: chainHuntsLoading } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 && subgraphHunts.length === 0 },
  })

  // Real title/description/clues to merge into chain-sourced hunts — only
  // needed when the subgraph is empty/unreachable and we're building hunts
  // straight from raw contract reads (which know nothing about metadata).
  const { data: metadataList, isLoading: metadataLoading } = useQuery({
    queryKey: ['all-hunt-metadata'],
    queryFn:  getAllHuntMetadata,
    enabled:  subgraphHunts.length === 0 && contracts.length > 0,
    staleTime: 30_000,
  })

  // If subgraph has data, use it; otherwise use on-chain (merged with real
  // backend metadata) or fall back to demos as an absolute last resort.
  const hunts: Hunt[] = useMemo(() => {
    if (subgraphHunts.length > 0) return subgraphHunts

    // Convert on-chain data to Hunt objects
    if (onChainHunts && onChainHunts.length > 0) {
      const metaById = new Map((metadataList ?? []).map((m: HuntMetadata) => [m.huntId, m]))

      return onChainHunts
        .map((result, i) => {
          const data = result.result as any
          if (!data || data.id === 0n) return null

          const huntId = String(i + 1)
          const metadata = metaById.get(huntId)

          return {
            id:               huntId,
            onChainId:        data.id,
            creator:          data.creator,
            clueCount:        data.clueCount,
            prize:            data.prize,
            participantCount: Number(data.participantCount),
            correctCount:     Number(data.correctCount),
            createdAt:        Number(data.createdAt),
            endTime:          Number(data.endTime) || undefined,
            huntType:         data.huntType as HuntType,
            status:           data.status as HuntStatus,
            winner:           data.winner !== '0x0000000000000000000000000000000000000000'
                                ? data.winner : undefined,
            vrfRequestId:     data.vrfRequestId,
            prizeClaimed:     data.prizeClaimed,
            title:            metadata?.title || `Hunt #${huntId}`,
            description:      metadata?.description || `A treasure hunt with ${(Number(data.prize) / 1e18).toFixed(4)} ETH prize`,
            story:            metadata?.story,
            difficulty:       metadata?.difficulty ?? Difficulty.Medium,
            category:         metadata?.category,
            tags:             metadata?.tags,
            isBusiness:       metadata?.isBusiness,
            businessName:     metadata?.businessName,
            businessLogo:     metadata?.businessLogo,
            businessAccent:   metadata?.businessAccent,
            isAiGenerated:    metadata?.isAiGenerated,
            aiConfidence:     metadata?.aiConfidence,
            clues:            metadata?.clues?.map(c => ({
                                id:       `${c.order}`,
                                order:    c.order,
                                text:     c.text,
                                hint:     c.hint,
                                location: { url: c.url, page: c.page, section: c.section, label: c.label },
                              })) ?? [],
          } as Hunt
        })
        .filter(Boolean) as Hunt[]
    }

    return DEMO_HUNTS
  }, [subgraphHunts, onChainHunts, metadataList])

  return {
    hunts,
    count: count ? Number(count) : DEMO_HUNTS.length,
    isLoading: sgLoading || chainHuntsLoading || metadataLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useHuntParticipation — check if current user has participated/solved
// ─────────────────────────────────────────────────────────────────────────────

export function useHuntParticipation(huntId: string | undefined, playerAddress: `0x${string}` | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'hasParticipated',
        args:         id && playerAddress ? [id, playerAddress] : undefined,
      },
      {
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'hasSolved',
        args:         id && playerAddress ? [id, playerAddress] : undefined,
      },
    ],
    query: { enabled: !!id && !!playerAddress, staleTime: 5_000 },
  })

  return {
    hasParticipated: (data?.[0]?.result as boolean) ?? false,
    hasSolved:       (data?.[1]?.result as boolean) ?? false,
    isLoading,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useClueProgress — on-chain source of truth for "which clue is this player on"
// Replaces pure-localStorage tracking so progress survives device/browser switches.
// ─────────────────────────────────────────────────────────────────────────────

export function useClueProgress(huntId: string | undefined, playerAddress: `0x${string}` | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data, isLoading, refetch } = useReadContract({
    address:      addresses.TREASURE_HUNT,
    abi:          TREASURE_HUNT_ABI,
    functionName: 'getClueProgress',
    args:         id && playerAddress ? [id, playerAddress] : undefined,
    query:        { enabled: !!id && !!playerAddress, staleTime: 5_000 },
  })

  return {
    clueIndex: data !== undefined ? Number(data) : undefined,
    isLoading,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useCorrectSolvers — list of correct solvers for a mystery draw
// ─────────────────────────────────────────────────────────────────────────────

export function useCorrectSolvers(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data, isLoading } = useReadContract({
    address:      addresses.TREASURE_HUNT,
    abi:          TREASURE_HUNT_ABI,
    functionName: 'getCorrectSolvers',
    args:         id ? [id] : undefined,
    query:        { enabled: !!id, staleTime: 10_000 },
  })

  return {
    solvers:      (data as `0x${string}`[]) ?? [],
    solverCount:  (data as `0x${string}`[])?.length ?? 0,
    isLoading,
  }
}
