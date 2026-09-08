import { useQuery } from '@tanstack/react-query'
import {
  fetchHunts,
  fetchHunt,
  fetchLeaderboard,
  fetchCreatorHunts,
  fetchHuntAnalytics,
} from '@/services/graph'
import { HuntStatus, type Hunt, type LeaderboardEntry, type HuntAnalytics } from '@/types'

export function useSubgraphHunts(options?: {
  status?: HuntStatus
  first?:  number
  skip?:   number
}) {
  const { status, first = 20, skip = 0 } = options ?? {}

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:  ['subgraph', 'hunts', status, first, skip],
    queryFn:   () => fetchHunts({ status, first, skip }),
    staleTime: 30_000,
  })

  return {
    hunts:     (data ?? []) as Hunt[],
    isLoading,
    isError,
    refetch,
  }
}

export function useSubgraphHunt(huntId: string | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['subgraph', 'hunt', huntId],
    queryFn:  () => fetchHunt(huntId!),
    enabled:  !!huntId,
    staleTime: 15_000,
  })

  return { hunt: data ?? null, isLoading, isError }
}

export function useLeaderboard(first = 50) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['subgraph', 'leaderboard', first],
    queryFn:  () => fetchLeaderboard(first),
    staleTime: 60_000,
  })

  return {
    entries:   (data ?? []) as LeaderboardEntry[],
    isLoading,
    isError,
  }
}

export function useCreatorHunts(creatorAddress: string | undefined) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subgraph', 'creator-hunts', creatorAddress],
    queryFn:  () => fetchCreatorHunts(creatorAddress!),
    enabled:  !!creatorAddress,
    staleTime: 30_000,
  })

  return {
    hunts:     (data ?? []) as Hunt[],
    isLoading,
    isError,
    refetch,
  }
}

export function useHuntAnalytics(huntId: string | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['subgraph', 'analytics', huntId],
    queryFn:  () => fetchHuntAnalytics(huntId!),
    enabled:  !!huntId,
    staleTime: 30_000,
  })

  return {
    analytics: data as HuntAnalytics | null,
    isLoading,
    isError,
  }
}
