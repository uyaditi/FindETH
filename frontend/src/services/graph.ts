import { GraphQLClient, gql } from 'graphql-request'
import { SUBGRAPH_URL } from '@/lib/constants'
import { Difficulty, HuntStatus, HuntType, type Hunt, type LeaderboardEntry, type HuntAnalytics } from '@/types'
import { getAllHuntMetadata, getHuntMetadata, type HuntMetadata } from '@/lib/huntMetadata'

const client = new GraphQLClient(SUBGRAPH_URL)

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
