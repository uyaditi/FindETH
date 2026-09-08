import { useReadContract, useReadContracts, useChainId } from 'wagmi'
import { useMemo } from 'react'
import { TREASURE_HUNT_ABI } from '@/contracts/abis'
import { getAddresses } from '@/contracts/addresses'
import { HuntStatus, HuntType, type Hunt, Difficulty } from '@/types'
import { DEMO_HUNTS, getDemoHunt } from '@/data/demoHunts'
import { useSubgraphHunts } from './useSubgraph'

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

  const hunt = useMemo<Hunt | undefined>(() => {
    if (!huntId) return undefined

    // Prefer on-chain data merged with demo metadata
    if (onChain && onChain.id > 0n) {
      const demo = getDemoHunt(huntId)
      return {
        ...(demo ?? {}),
        id:               huntId,
        onChainId:        onChain.id,
        creator:          onChain.creator,
        answerHash:       onChain.answerHash,
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
        // Fill from demo if no on-chain metadata
        title:       demo?.title ?? `Hunt #${huntId}`,
        description: demo?.description ?? '',
        difficulty:  demo?.difficulty ?? Difficulty.Medium,
        clues:       demo?.clues,
      } as Hunt
    }

    // Fallback to demo
    return getDemoHunt(huntId)
  }, [onChain, huntId])

  return { hunt, isLoading, isError }
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

  // If subgraph has data, use it; otherwise fall back to demos
  const hunts: Hunt[] = useMemo(() => {
    if (subgraphHunts.length > 0) return subgraphHunts
    return DEMO_HUNTS
  }, [subgraphHunts])

  return {
    hunts,
    count: count ? Number(count) : DEMO_HUNTS.length,
    isLoading: sgLoading,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useHuntParticipation — check if current user has participated/solved
// ─────────────────────────────────────────────────────────────────────────────

export function useHuntParticipation(huntId: string | undefined, playerAddress: `0x${string}` | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)
  const id        = huntId ? BigInt(huntId) : undefined

  const { data, isLoading } = useReadContracts({
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
