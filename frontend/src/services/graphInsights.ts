/**
 * graphInsights.ts
 *
 * Transforms raw PlatformAnalytics + CategoryInsights from The Graph into
 * structured, AI-readable recommendations that are injected into the hunt
 * generation prompt. This is the bridge between live on-chain data and the
 * AI generation pipeline — making The Graph load-bearing in the AI flow.
 *
 * Used by: services/ai.ts → generateHunt()
 * Data source: The Graph subgraph (Subgraph Studio, live Sepolia data)
 */

import { fetchPlatformAnalytics, fetchCategoryInsights } from './graph'
import type { PlatformAnalytics, CategoryInsights } from './graph'
import type { Difficulty, HuntType } from '@/types'
import { HuntType as HuntTypeEnum } from '@/types'

// ── Exported types ─────────────────────────────────────────────────────────────

/** Machine-readable recommendations derived from live subgraph analytics. */
export interface GraphRecommendations {
  // Prize guidance
  recommendedPrizeEth:  number    // single best-fit value
  prizeRangeEth:        { min: number; max: number }
  prizeRationale:       string

  // Difficulty guidance
  recommendedDifficulty: Difficulty
  difficultyRationale:   string

  // Clue structure guidance
  recommendedClueCount: number
  clueCountRationale:   string

  // Hunt type guidance
  recommendedHuntType:  HuntType
  huntTypeRationale:    string

  // Platform context — shown in the UI and injected into the AI prompt
  platformContext: PlatformContext

  // Whether this came from live data or fell back to defaults
  source: 'live' | 'fallback'
}

export interface PlatformContext {
  totalHunts:        number
  totalParticipants: number
  totalPrizeEth:     number   // converted from wei
  avgCompletionRate: number   // 0–100
  topHuntPrizeRange: { min: number; max: number }
  sampleSize:        number

  // For display in the Graph data panel
  dataSource:        string   // Subgraph Studio URL or 'demo'
  queriedAt:         string   // ISO timestamp
}

// ── Difficulty mapping ─────────────────────────────────────────────────────────

function normaliseDifficulty(raw: string | null | undefined): Difficulty {
  const d = (raw ?? '').toLowerCase()
  if (d === 'easy')   return 'easy' as Difficulty
  if (d === 'hard')   return 'hard' as Difficulty
  if (d === 'expert') return 'expert' as Difficulty
  return 'medium' as Difficulty
}

// ── Core derivation logic ──────────────────────────────────────────────────────

function deriveRecommendations(
  platform: PlatformAnalytics,
  category: CategoryInsights,
  dataSource: string,
): GraphRecommendations {

  // ── Prize ──────────────────────────────────────────────────────────────────
  // Use the median prize of top-participating hunts as the sweet spot.
  // Clamp to a sensible range (0.01–2 ETH).
  const rawPrize = category.prizeSweet > 0 ? category.prizeSweet : platform.medianPrizeEth
  const prizeEth = Math.max(0.01, Math.min(2, parseFloat(rawPrize.toFixed(3))))

  const prizeMin = Math.max(0.01, parseFloat((prizeEth * 0.5).toFixed(3)))
  const prizeMax = parseFloat((prizeEth * 2).toFixed(3))

  const prizeRationale =
    platform.sampleSize > 0
      ? `Based on ${platform.sampleSize} hunts indexed by The Graph: ` +
        `median prize of top-performing hunts is ${prizeEth.toFixed(3)} ETH. ` +
        `Platform average is ${platform.avgPrizeEth.toFixed(3)} ETH.`
      : `No live data available — using default prize of ${prizeEth} ETH.`

  // ── Difficulty ─────────────────────────────────────────────────────────────
  // Pick the difficulty with the highest average completion rate.
  // Fall back to 'medium' if data is insufficient.
  const bestRaw = platform.bestCompletionDifficulty
  const recommendedDifficulty = normaliseDifficulty(bestRaw)

  const completionPct = platform.completionByDifficulty[bestRaw ?? ''] ?? platform.avgCompletionRate
  const difficultyRationale =
    bestRaw && completionPct > 0
      ? `"${recommendedDifficulty}" difficulty achieves the highest average completion rate ` +
        `(${Math.round(completionPct)}%) across ${platform.sampleSize} indexed hunts on The Graph. ` +
        `Platform-wide average completion: ${platform.avgCompletionRate}%.`
      : `Insufficient on-chain data — defaulting to "medium" difficulty.`

  // ── Clue count ─────────────────────────────────────────────────────────────
  // Use the modal clue count from solved hunts — the count that appears most
  // often in successfully completed hunts on-chain.
  const clueCount = Math.max(2, Math.min(10, category.optimalClueCount))
  const clueCountRationale =
    category.raceHunts.length + category.drawHunts.length > 0
      ? `${clueCount} clues is the most common count in solved hunts indexed by The Graph ` +
        `(modal value across ${category.raceHunts.length + category.drawHunts.length} sampled hunts).`
      : `No solved hunt data available — using default of ${clueCount} clues.`

  // ── Hunt type ──────────────────────────────────────────────────────────────
  // Recommend whichever type has the higher average completion rate on-chain.
  const recommendedHuntType =
    category.recommendedType === 'Race' ? HuntTypeEnum.Race : HuntTypeEnum.MysteryDraw

  const raceLabel = `Race (${Math.round(category.raceAvgCompletion)}% avg completion)`
  const drawLabel = `MysteryDraw (${Math.round(category.drawAvgCompletion)}% avg completion)`
  const huntTypeRationale =
    category.raceHunts.length + category.drawHunts.length > 0
      ? `${category.recommendedType} outperforms the alternative on-chain: ${raceLabel} vs ${drawLabel}.`
      : `No hunt type comparison data available — defaulting to MysteryDraw.`

  // ── Platform context ───────────────────────────────────────────────────────
  const platformContext: PlatformContext = {
    totalHunts:        platform.totalHunts,
    totalParticipants: platform.totalParticipants,
    totalPrizeEth:     Number(platform.totalPrizeEthWei) / 1e18,
    avgCompletionRate: platform.avgCompletionRate,
    topHuntPrizeRange: platform.topHuntPrizeRange,
    sampleSize:        platform.sampleSize,
    dataSource,
    queriedAt:         new Date().toISOString(),
  }

  return {
    recommendedPrizeEth:   prizeEth,
    prizeRangeEth:         { min: prizeMin, max: prizeMax },
    prizeRationale,
    recommendedDifficulty,
    difficultyRationale,
    recommendedClueCount:  clueCount,
    clueCountRationale,
    recommendedHuntType,
    huntTypeRationale,
    platformContext,
    source: 'live',
  }
}

// ── Fallback when subgraph is unreachable ──────────────────────────────────────

function fallbackRecommendations(dataSource: string): GraphRecommendations {
  const platformContext: PlatformContext = {
    totalHunts:        0,
    totalParticipants: 0,
    totalPrizeEth:     0,
    avgCompletionRate: 0,
    topHuntPrizeRange: { min: 0.05, max: 0.5 },
    sampleSize:        0,
    dataSource,
    queriedAt:         new Date().toISOString(),
  }
  return {
    recommendedPrizeEth:   0.05,
    prizeRangeEth:         { min: 0.01, max: 0.5 },
    prizeRationale:        'The Graph subgraph is not yet reachable — using default values.',
    recommendedDifficulty: 'medium' as Difficulty,
    difficultyRationale:   'The Graph subgraph is not yet reachable — using default values.',
    recommendedClueCount:  4,
    clueCountRationale:    'The Graph subgraph is not yet reachable — using default values.',
    recommendedHuntType:   HuntTypeEnum.MysteryDraw,
    huntTypeRationale:     'The Graph subgraph is not yet reachable — using default values.',
    platformContext,
    source: 'fallback',
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Queries The Graph for live platform analytics and category insights, then
 * derives structured AI recommendations.
 *
 * Always resolves — returns a fallback object if the subgraph is unreachable
 * so the AI pipeline never hard-blocks on a missing API key.
 *
 * @param dataSource - The subgraph URL shown in the UI (from VITE_SUBGRAPH_URL)
 */
export async function getGraphRecommendations(dataSource: string): Promise<GraphRecommendations> {
  const [platform, category] = await Promise.all([
    fetchPlatformAnalytics(50),
    fetchCategoryInsights(30),
  ])

  if (!platform || !category) {
    return fallbackRecommendations(dataSource)
  }

  return deriveRecommendations(platform, category, dataSource)
}

/**
 * Formats a GraphRecommendations object into a plain-text block that can be
 * appended to the AI system prompt. The AI model uses this to ground its
 * prize, difficulty, clue count, and hunt-type choices in real on-chain data.
 */
export function formatRecommendationsForPrompt(rec: GraphRecommendations): string {
  const { platformContext: ctx } = rec

  const lines: string[] = [
    '=== LIVE PLATFORM DATA FROM THE GRAPH (Sepolia Subgraph) ===',
    '',
    `Source:           ${ctx.dataSource}`,
    `Queried at:       ${ctx.queriedAt}`,
    `Hunts indexed:    ${ctx.totalHunts}`,
    `Total players:    ${ctx.totalParticipants.toLocaleString()}`,
    `Total prize pool: ${ctx.totalPrizeEth.toFixed(2)} ETH distributed on-chain`,
    `Avg completion:   ${ctx.avgCompletionRate}% across last ${ctx.sampleSize} hunts`,
    '',
    '--- AI Recommendations derived from live data ---',
    '',
    `PRIZE:      ${rec.recommendedPrizeEth} ETH (range: ${rec.prizeRangeEth.min}–${rec.prizeRangeEth.max} ETH)`,
    `  Rationale: ${rec.prizeRationale}`,
    '',
    `DIFFICULTY: ${rec.recommendedDifficulty}`,
    `  Rationale: ${rec.difficultyRationale}`,
    '',
    `CLUE COUNT: ${rec.recommendedClueCount} clues`,
    `  Rationale: ${rec.clueCountRationale}`,
    '',
    `HUNT TYPE:  ${rec.recommendedHuntType === HuntTypeEnum.Race ? 'Race' : 'MysteryDraw'}`,
    `  Rationale: ${rec.huntTypeRationale}`,
    '',
    'Use these data-grounded values as defaults unless the creator explicitly',
    'overrides them. Always mention that recommendations come from live on-chain data.',
    '=== END GRAPH DATA ===',
  ]

  return lines.join('\n')
}
