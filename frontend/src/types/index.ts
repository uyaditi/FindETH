// ─────────────────────────────────────────────────────────────────────────────
// Core domain types mirroring the Solidity structs + extended UI state
// ─────────────────────────────────────────────────────────────────────────────

export enum HuntType {
  Race        = 0,
  MysteryDraw = 1,
}

export enum HuntStatus {
  Active    = 0,
  Closed    = 1,
  Solved    = 2,
  Cancelled = 3,
}

export enum Difficulty {
  Easy   = 'easy',
  Medium = 'medium',
  Hard   = 'hard',
  Expert = 'expert',
}

// ── On-chain Hunt struct (as returned by contract) ────────────────────────────
export interface OnChainHunt {
  id:               bigint
  creator:          `0x${string}`
  clueCount:        bigint
  prize:            bigint
  participantCount: bigint
  correctCount:     bigint
  createdAt:        bigint
  endTime:          bigint
  huntType:         HuntType
  status:           HuntStatus
  winner:           `0x${string}`
  vrfRequestId:     bigint
  prizeClaimed:     boolean
}

// ── Extended hunt with off-chain / indexed metadata ───────────────────────────
// Deliberately not `extends OnChainHunt` — every field the UI needs is
// redeclared below with UI-friendly types (number/string instead of
// bigint/`0x${string}`), since the two shapes diverge on almost every field.
export interface Hunt {
  // Core identity
  id:          string        // string for UI (bigint serialisation)
  onChainId?:  bigint

  // Raw on-chain extras not otherwise represented above
  clueCount?:    bigint
  vrfRequestId?: bigint
  prizeClaimed?: boolean

  // Metadata (stored off-chain / in subgraph)
  title:       string
  description: string
  story?:      string
  difficulty:  Difficulty
  category?:   string
  tags?:       string[]
  coverImage?: string

  // Hunt config
  huntType:    HuntType
  status:      HuntStatus
  prize:       bigint
  endTime?:    number        // unix timestamp

  // Creator
  creator:     string
  creatorEns?: string

  // Stats
  participantCount: number
  correctCount:     number
  winner?:          string
  winnerEns?:       string

  // Clues (only shown to active players)
  clues?:      Clue[]

  // Business / AI hunt metadata
  isBusiness?:        boolean
  businessName?:      string
  businessLogo?:      string
  businessAccent?:    string
  isAiGenerated?:     boolean
  aiConfidence?:      number

  // Timestamps
  createdAt:   number
}

// ── Clue ─────────────────────────────────────────────────────────────────────
export interface Clue {
  id:       string
  order:    number
  text:     string
  hint?:    string
  answer?:  string           // plaintext — only ever present client-side during creation review;
                              // the backend never stores or returns it (only the on-chain hash exists after publish)
  location: ClueLocation
  imageUrl?: string

  // AI-generated extras
  placementInstruction?: string
  reason?:               string
  merchantAction?:       string
  locationFound?:        boolean
}

export interface ClueLocation {
  url?:     string
  page?:    string
  section?: string
  label?:   string
}

// ── AI Generation ─────────────────────────────────────────────────────────────
export interface AIHuntGenerationInput {
  businessUrl?:    string
  businessDescription?: string
  businessName:   string
  businessType:   string
  campaign:       string
  targetAudience: string
  channels:       string[]
  difficulty:     Difficulty
  huntType:       HuntType
  prize:          string     // ETH string e.g. "0.05"
  numClues:       number     // 2-10
}

export interface AIGeneratedHunt {
  title:          string
  description:    string
  story:          string
  difficulty:     Difficulty
  huntType:       HuntType
  clues:          AIGeneratedClue[]
  finalAnswer:    string
  suggestedPrize: string
  confidence:     number

  // Generation summary
  analysedPages?: number
  analysedBlogs?: number
  analysedProducts?: number
}

export interface AIGeneratedClue {
  order:                number
  text:                 string
  answer:               string
  location:             ClueLocation
  placementInstruction: string
  reason:               string
  merchantAction:       string
  locationFound:        boolean
}

// ── NFT / Trophy ─────────────────────────────────────────────────────────────
export interface Trophy {
  tokenId:     bigint
  huntId:      bigint
  winner:      string
  mintedAt:    bigint
  prizeAmount: bigint
  huntTitle:   string
  tokenUri?:   string
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank:          number
  address:       string
  ensName?:      string
  wins:          number
  huntsSolved:   number
  totalEarned:   bigint
  nftsOwned:     number
}

// ── Analytics ────────────────────────────────────────────────────────────────
export interface HuntAnalytics {
  huntId:           string
  totalParticipants: number
  uniquePlayers:     number
  correctSolvers:    number
  incorrectAttempts: number
  completionRate:    number
  avgSolveTime?:     number   // seconds
  clueDropOff?:      number[] // drop-off at each clue position
  winner?:           string
  prizeDistributed:  bigint
  nftsMinted:        number
  vrfRequestId?:     string
}

// ── Transaction states ────────────────────────────────────────────────────────
export type TxState =
  | 'idle'
  | 'confirming'    // waiting for wallet
  | 'pending'       // submitted, awaiting block
  | 'success'
  | 'error'

export interface TxStatus {
  state:    TxState
  hash?:    string
  message?: string
  error?:   string
}

// ── Creator wizard forms ──────────────────────────────────────────────────────
export interface CreateHuntForm {
  // Step 1 — Mystery
  title:       string
  description: string
  story:       string
  difficulty:  Difficulty
  category:    string
  tags:        string
  coverImage:  string

  // Step 2 — Clues
  clues:       ClueFormItem[]

  // Step 3 — Reward
  huntType:    HuntType
  prize:       string    // ETH string

  // Business/branding
  isBusiness:    boolean
  businessName:  string
  businessLogo:  string
  accentColor:   string
}

export interface ClueFormItem {
  id:       string
  order:    number
  text:     string
  hint:     string
  answer:   string
  page:     string
  url:      string
  imageUrl: string
}

// ── User profile ──────────────────────────────────────────────────────────────
export interface UserProfile {
  address:     string
  ensName?:    string
  avatarUrl?:  string

  // Activity
  createdHunts:  Hunt[]
  solvedHunts:   Hunt[]
  wonHunts:      Hunt[]
  trophies:      Trophy[]

  // Totals
  totalEarned:   bigint
  totalWins:     number
  huntsSolved:   number
  huntsCreated:  number
}

// ── Plan / Monetisation ───────────────────────────────────────────────────────
export type PlanTier = 'free' | 'hosted' | 'ai' | 'enterprise'

export interface Plan {
  id:          PlanTier
  name:        string
  description: string
  features:    string[]
  maxHunts:    number
  aiEnabled:   boolean
  customBrand: boolean
  analytics:   boolean
  customDomain: boolean
}

// ── Subgraph entities ─────────────────────────────────────────────────────────
export interface SubgraphHunt {
  id:               string
  creator:          string
  prize:            string
  participantCount: string
  correctCount:     string
  status:           string
  huntType:         string
  createdAt:        string
  endTime:          string
  winner?:          string
  vrfRequestId?:    string
}

export interface SubgraphPlayer {
  id:            string
  address:       string
  wins:          string
  huntsSolved:   string
  totalEarned:   string
  nftsOwned:     string
}
