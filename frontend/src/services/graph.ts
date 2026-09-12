import { GraphQLClient, gql } from 'graphql-request'
import { SUBGRAPH_URL } from '@/lib/constants'
import { Difficulty, HuntStatus, HuntType, type Hunt, type LeaderboardEntry, type HuntAnalytics } from '@/types'
import { getAllHuntMetadata, getHuntMetadata, type HuntMetadata } from '@/lib/huntMetadata'

// Build headers: include The Graph API key when provided (required for
// Subgraph Studio decentralised queries; ignored for hosted-service/local).
function buildHeaders(): Record<string, string> {
  const key = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GRAPH_API_KEY) || ''
  return key ? { Authorization: `Bearer ${key}` } : {}
}

const client = new GraphQLClient(SUBGRAPH_URL, { headers: buildHeaders() })

// ─────────────────────────────────────────────────────────────────────────────
// Metadata merge — real hunt titles/descriptions/clues come from the backend
// (backend/), not the subgraph (which only ever knows on-chain fields).
// When the subgraph itself is unreachable (e.g. not deployed for local dev),
// these functions return empty results so callers (useHunt.ts) fall back to
// reading directly from the chain instead of masking real hunts with fake data.
// ─────────────────────────────────────────────────────────────────────────────

function mapMetadata(m: HuntMetadata | null | undefined): Partial<Hunt> {
  if (!m) return {}
  return {
    title:          m.title,
    description:    m.description,
    story:          m.story,
    difficulty:     m.difficulty,
    category:       m.category,
    tags:           m.tags,
    clues:          m.clues?.map(c => ({
      id:       `${c.order}`,
      order:    c.order,
      text:     c.text,
      hint:     c.hint,
      location: { url: c.url, page: c.page, section: c.section, label: c.label },
    })),
    isBusiness:     m.isBusiness,
    businessName:   m.businessName,
    businessLogo:   m.businessLogo,
    businessAccent: m.businessAccent,
    isAiGenerated:  m.isAiGenerated,
    aiConfidence:   m.aiConfidence,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

const HUNTS_QUERY = gql`
  query GetHunts($first: Int!, $skip: Int!, $where: Hunt_filter) {
    hunts(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
      where: $where
    ) {
      id
      creator
      prize
      participantCount
      correctCount
      status
      huntType
      createdAt
      endTime
      winner
      vrfRequestId
    }
  }
`

const HUNT_QUERY = gql`
  query GetHunt($id: ID!) {
    hunt(id: $id) {
      id
      creator
      prize
      participantCount
      correctCount
      status
      huntType
      createdAt
      endTime
      winner
      vrfRequestId
      solutions {
        player
        correct
        timestamp
      }
    }
  }
`

const LEADERBOARD_QUERY = gql`
  query GetLeaderboard($first: Int!) {
    players(
      first: $first
      orderBy: wins
      orderDirection: desc
    ) {
      id
      wins
      huntsSolved
      totalEarned
      nftsOwned
    }
  }
`

const CREATOR_HUNTS_QUERY = gql`
  query GetCreatorHunts($creator: String!) {
    hunts(
      where: { creator: $creator }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      prize
      participantCount
      correctCount
      status
      huntType
      createdAt
      endTime
      winner
    }
  }
`

const HUNT_ANALYTICS_QUERY = gql`
  query GetHuntAnalytics($huntId: ID!) {
    hunt(id: $huntId) {
      id
      participantCount
      correctCount
      status
      winner
      prize
      solutions {
        player
        correct
        timestamp
      }
      randomnessRequests {
        requestId
        fulfilled
        randomWord
      }
    }
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — map subgraph data → domain types
// ─────────────────────────────────────────────────────────────────────────────

function mapHunt(raw: Record<string, string>): Partial<Hunt> {
  return {
    id:               raw.id,
    creator:          raw.creator,
    prize:            BigInt(raw.prize ?? '0'),
    participantCount: Number(raw.participantCount ?? 0),
    correctCount:     Number(raw.correctCount ?? 0),
    status:           Number(raw.status ?? 0) as HuntStatus,
    huntType:         Number(raw.huntType ?? 0) as HuntType,
    createdAt:        Number(raw.createdAt ?? 0),
    endTime:          raw.endTime ? Number(raw.endTime) : undefined,
    winner:           raw.winner || undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchHunts(options: {
  first?: number
  skip?:  number
  status?: HuntStatus
}): Promise<Hunt[]> {
  const { first = 20, skip = 0, status } = options

  try {
    const where = status !== undefined ? { status: String(status) } : undefined
    const [data, metadataList] = await Promise.all([
      client.request<{ hunts: Record<string, string>[] }>(HUNTS_QUERY, { first, skip, where }),
      getAllHuntMetadata(),
    ])
    const metaById = new Map(metadataList.map(m => [m.huntId, m]))

    return data.hunts.map(raw => ({
      ...mapHunt(raw),
      ...mapMetadata(metaById.get(raw.id)),
      id: raw.id,
    })) as Hunt[]
  } catch {
    // Subgraph unreachable/not deployed (the common case for local dev) —
    // return empty so callers fall back to reading directly from the chain,
    // rather than masking real on-chain hunts behind hardcoded demo data.
    return []
  }
}

export async function fetchHunt(id: string): Promise<Hunt | null> {
  try {
    const [data, metadata] = await Promise.all([
      client.request<{ hunt: Record<string, string> | null }>(HUNT_QUERY, { id }),
      getHuntMetadata(id),
    ])
    if (!data.hunt) return null

    return {
      ...mapMetadata(metadata),
      ...mapHunt(data.hunt),
      id,
    } as Hunt
  } catch {
    return null
  }
}

export async function fetchLeaderboard(first = 50): Promise<LeaderboardEntry[]> {
  try {
    const data = await client.request<{
      players: { id: string; wins: string; huntsSolved: string; totalEarned: string; nftsOwned: string }[]
    }>(LEADERBOARD_QUERY, { first })

    return data.players.map((p, i) => ({
      rank:        i + 1,
      address:     p.id,
      wins:        Number(p.wins),
      huntsSolved: Number(p.huntsSolved),
      totalEarned: BigInt(p.totalEarned),
      nftsOwned:   Number(p.nftsOwned),
    }))
  } catch {
    // Return mock leaderboard when subgraph unavailable
    return MOCK_LEADERBOARD
  }
}

export async function fetchCreatorHunts(creatorAddress: string): Promise<Hunt[]> {
  try {
    const [data, metadataList] = await Promise.all([
      client.request<{ hunts: Record<string, string>[] }>(
        CREATOR_HUNTS_QUERY,
        { creator: creatorAddress.toLowerCase() }
      ),
      getAllHuntMetadata(),
    ])
    const metaById = new Map(metadataList.map(m => [m.huntId, m]))

    return data.hunts.map(raw => ({
      ...mapHunt(raw),
      ...mapMetadata(metaById.get(raw.id)),
      id: raw.id,
    })) as Hunt[]
  } catch {
    return []
  }
}

export async function fetchHuntAnalytics(huntId: string): Promise<HuntAnalytics | null> {
  try {
    const data = await client.request<{ hunt: {
      id: string
      participantCount: string
      correctCount: string
      status: string
      winner?: string
      prize: string
      solutions: { player: string; correct: boolean; timestamp: string }[]
      randomnessRequests: { requestId: string; fulfilled: boolean }[]
    } | null }>(HUNT_ANALYTICS_QUERY, { huntId })

    if (!data.hunt) return null
    const h = data.hunt
    const total = Number(h.participantCount)
    const correct = Number(h.correctCount)

    return {
      huntId,
      totalParticipants: total,
      uniquePlayers:     total,
      correctSolvers:    correct,
      incorrectAttempts: h.solutions.filter(s => !s.correct).length,
      completionRate:    total > 0 ? Math.round((correct / total) * 100) : 0,
      winner:            h.winner || undefined,
      prizeDistributed:  BigInt(h.prize),
      nftsMinted:        h.winner ? 1 : 0,
      vrfRequestId:      h.randomnessRequests[0]?.requestId,
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock leaderboard for demo
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', ensName: 'treasuremaster.eth', wins: 12, huntsSolved: 34, totalEarned: 1200000000000000000n, nftsOwned: 12 },
  { rank: 2, address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', ensName: 'cryptohunter.eth',   wins: 8,  huntsSolved: 29, totalEarned: 800000000000000000n,  nftsOwned: 8  },
  { rank: 3, address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', ensName: undefined,          wins: 7,  huntsSolved: 25, totalEarned: 600000000000000000n,  nftsOwned: 7  },
  { rank: 4, address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', ensName: 'solver.eth',         wins: 5,  huntsSolved: 18, totalEarned: 350000000000000000n,  nftsOwned: 5  },
  { rank: 5, address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', ensName: undefined,          wins: 4,  huntsSolved: 15, totalEarned: 250000000000000000n,  nftsOwned: 4  },
  { rank: 6, address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', ensName: 'finder.eth',        wins: 3,  huntsSolved: 12, totalEarned: 150000000000000000n,  nftsOwned: 3  },
  { rank: 7, address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9', ensName: undefined,          wins: 2,  huntsSolved: 9,  totalEarned: 100000000000000000n,  nftsOwned: 2  },
  { rank: 8, address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', ensName: 'seeker.eth',       wins: 2,  huntsSolved: 8,  totalEarned: 80000000000000000n,   nftsOwned: 2  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Platform analytics — used by the AI generation pipeline to ground prize,
// difficulty, and clue-count recommendations in live on-chain data.
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_ANALYTICS_QUERY = gql`
  query GetPlatformAnalytics($first: Int!) {
    globalStats(id: "global") {
      id
      totalHunts
      totalParticipants
      totalPrizeEth
      totalNFTsMinted
      totalWinners
    }
    # Sample recent hunts for distribution analysis
    recentHunts: hunts(
      first: $first
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      prize
      participantCount
      correctCount
      clueCount
      huntType
      status
      difficulty
      createdAt
    }
    # Solved hunts only — for completion-rate & prize benchmarks
    solvedHunts: hunts(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      where: { status: Solved }
    ) {
      id
      prize
      participantCount
      correctCount
      clueCount
      huntType
      difficulty
    }
  }
`

const CATEGORY_INSIGHTS_QUERY = gql`
  query GetCategoryInsights($first: Int!) {
    # Race hunts — performance metrics
    raceHunts: hunts(
      first: $first
      orderBy: participantCount
      orderDirection: desc
      where: { huntType: Race }
    ) {
      id
      prize
      participantCount
      correctCount
      clueCount
      status
      difficulty
    }
    # MysteryDraw hunts — performance metrics
    drawHunts: hunts(
      first: $first
      orderBy: participantCount
      orderDirection: desc
      where: { huntType: MysteryDraw }
    ) {
      id
      prize
      participantCount
      correctCount
      clueCount
      status
      difficulty
    }
    # Top-prize hunts — what prize sizes attract most players
    topPrizeHunts: hunts(
      first: 10
      orderBy: prize
      orderDirection: desc
    ) {
      id
      prize
      participantCount
      correctCount
    }
  }
`

// ── Domain types ──────────────────────────────────────────────────────────────

export interface RawHuntSample {
  id:               string
  prize:            string
  participantCount: string
  correctCount:     string
  clueCount:        string
  huntType:         string   // 'Race' | 'MysteryDraw'
  status:           string
  difficulty:       string | null
  createdAt?:       string
}

export interface PlatformAnalytics {
  // Global totals from the GlobalStats entity
  totalHunts:        number
  totalParticipants: number
  totalPrizeEthWei:  bigint
  totalNFTsMinted:   number
  totalWinners:      number

  // Derived aggregates across recent hunts (last N)
  sampleSize:              number
  avgCompletionRate:       number    // 0–100
  medianPrizeEth:          number
  avgPrizeEth:             number
  avgClueCount:            number
  difficultyDistribution:  Record<string, number>   // difficulty → count
  huntTypeDistribution:    Record<string, number>   // huntType → count
  completionByDifficulty:  Record<string, number>   // difficulty → avg completion%

  // What difficulty level has the highest completion rate
  bestCompletionDifficulty: string | null
  // Prize range of top-performing hunts (highest participant count)
  topHuntPrizeRange:  { min: number; max: number }

  // Raw sample for further processing
  solvedHunts: RawHuntSample[]
}

export interface CategoryInsights {
  raceHunts:     RawHuntSample[]
  drawHunts:     RawHuntSample[]
  topPrizeHunts: RawHuntSample[]

  // Computed
  raceAvgCompletion: number
  drawAvgCompletion: number
  recommendedType:   'Race' | 'MysteryDraw'  // whichever has better completion

  // Optimal clue count (mode of clueCount in solved hunts)
  optimalClueCount: number

  // Prize sweet spot — median prize of top-10 by participation
  prizeSweet: number  // ETH
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function weiToEth(wei: string | bigint): number {
  return Number(BigInt(wei)) / 1e18
}

function completionRate(h: RawHuntSample): number {
  const p = Number(h.participantCount)
  if (p === 0) return 0
  return (Number(h.correctCount) / p) * 100
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mode(nums: number[]): number {
  if (nums.length === 0) return 4
  const freq: Record<number, number> = {}
  for (const n of nums) freq[n] = (freq[n] ?? 0) + 1
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

// ── Public fetch functions ─────────────────────────────────────────────────────

export async function fetchPlatformAnalytics(sampleSize = 50): Promise<PlatformAnalytics | null> {
  try {
    const data = await client.request<{
      globalStats: {
        id: string
        totalHunts: string
        totalParticipants: string
        totalPrizeEth: string
        totalNFTsMinted: string
        totalWinners: string
      } | null
      recentHunts:  RawHuntSample[]
      solvedHunts:  RawHuntSample[]
    }>(PLATFORM_ANALYTICS_QUERY, { first: sampleSize })

    const gs = data.globalStats
    const recent = data.recentHunts ?? []
    const solved = data.solvedHunts ?? []

    // Difficulty distribution
    const diffDist: Record<string, number> = {}
    const diffCompletion: Record<string, number[]> = {}
    for (const h of recent) {
      const d = h.difficulty ?? 'unknown'
      diffDist[d] = (diffDist[d] ?? 0) + 1
      if (!diffCompletion[d]) diffCompletion[d] = []
      diffCompletion[d].push(completionRate(h))
    }
    const completionByDiff: Record<string, number> = {}
    for (const [d, rates] of Object.entries(diffCompletion)) {
      completionByDiff[d] = rates.reduce((a, b) => a + b, 0) / rates.length
    }

    // Hunt type distribution
    const typeDist: Record<string, number> = {}
    for (const h of recent) {
      typeDist[h.huntType] = (typeDist[h.huntType] ?? 0) + 1
    }

    // Prize stats across recent hunts
    const priceEths = recent.map(h => weiToEth(h.prize))
    const avgPrize  = priceEths.length > 0 ? priceEths.reduce((a, b) => a + b, 0) / priceEths.length : 0

    // Avg completion
    const completions = recent.map(completionRate)
    const avgCompletion = completions.length > 0
      ? completions.reduce((a, b) => a + b, 0) / completions.length
      : 0

    // Best difficulty by completion rate
    const bestDiff = Object.entries(completionByDiff).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Top-participating hunts (top 10 by participantCount)
    const topByParticipation = [...recent]
      .sort((a, b) => Number(b.participantCount) - Number(a.participantCount))
      .slice(0, 10)
    const topPrices = topByParticipation.map(h => weiToEth(h.prize))
    const topPrizeRange = topPrices.length > 0
      ? { min: Math.min(...topPrices), max: Math.max(...topPrices) }
      : { min: 0.05, max: 0.5 }

    return {
      totalHunts:        gs ? Number(gs.totalHunts) : recent.length,
      totalParticipants: gs ? Number(gs.totalParticipants) : 0,
      totalPrizeEthWei:  gs ? BigInt(gs.totalPrizeEth) : 0n,
      totalNFTsMinted:   gs ? Number(gs.totalNFTsMinted) : 0,
      totalWinners:      gs ? Number(gs.totalWinners) : 0,

      sampleSize:              recent.length,
      avgCompletionRate:       Math.round(avgCompletion),
      medianPrizeEth:          median(priceEths),
      avgPrizeEth:             avgPrize,
      avgClueCount:            recent.length > 0
        ? recent.reduce((s, h) => s + Number(h.clueCount), 0) / recent.length
        : 4,
      difficultyDistribution:  diffDist,
      huntTypeDistribution:    typeDist,
      completionByDifficulty:  completionByDiff,
      bestCompletionDifficulty: bestDiff,
      topHuntPrizeRange:        topPrizeRange,
      solvedHunts:              solved,
    }
  } catch {
    return null
  }
}

export async function fetchCategoryInsights(sampleSize = 30): Promise<CategoryInsights | null> {
  try {
    const data = await client.request<{
      raceHunts:     RawHuntSample[]
      drawHunts:     RawHuntSample[]
      topPrizeHunts: RawHuntSample[]
    }>(CATEGORY_INSIGHTS_QUERY, { first: sampleSize })

    const race = data.raceHunts ?? []
    const draw = data.drawHunts ?? []
    const top  = data.topPrizeHunts ?? []

    const avg = (arr: RawHuntSample[]) =>
      arr.length === 0 ? 0 : arr.map(completionRate).reduce((a, b) => a + b, 0) / arr.length

    const raceAvg = avg(race)
    const drawAvg = avg(draw)

    // Optimal clue count: mode across all solved (status = Solved) hunts
    const allHunts = [...race, ...draw]
    const solvedClueCounts = allHunts
      .filter(h => h.status === 'Solved')
      .map(h => Number(h.clueCount))
      .filter(n => n > 0)
    const optClues = mode(solvedClueCounts.length > 0 ? solvedClueCounts : [4])

    // Prize sweet spot: median prize of top-10 by participation
    const topPrices = top.map(h => weiToEth(h.prize))
    const prizeSweet = median(topPrices.length > 0 ? topPrices : [0.05])

    return {
      raceHunts:         race,
      drawHunts:         draw,
      topPrizeHunts:     top,
      raceAvgCompletion: raceAvg,
      drawAvgCompletion: drawAvg,
      recommendedType:   raceAvg >= drawAvg ? 'Race' : 'MysteryDraw',
      optimalClueCount:  optClues,
      prizeSweet,
    }
  } catch {
    return null
  }
}
