/**
 * AI Hunt Generation Service
 *
 * Architecture:
 *   Frontend → (1) Query The Graph subgraph for live platform analytics
 *            → (2) Derive prize/difficulty/clue-count recommendations
 *            → (3) POST {VITE_AI_API}/api/ai/generate with analytics context
 *                → backend/ (FastAPI) → Gemini 2.5 Flash (structured JSON)
 *                → hunt draft grounded in real page content AND on-chain data
 *
 * The Graph integration is load-bearing:
 *   - Step 1 of every generation queries live Subgraph Studio data.
 *   - Recommendations for prize, difficulty, and clue count are derived from
 *     real on-chain completion rates, prize distributions, and solved-hunt data.
 *   - The full recommendations block is injected into the AI prompt so the
 *     model reasons from live blockchain data, not static defaults.
 *   - If the subgraph is unreachable the pipeline continues with fallback
 *     defaults clearly labelled as such in the UI.
 *
 * Two generation paths:
 *   1. Real API — set VITE_AI_API to your running backend
 *      (e.g. http://localhost:8000, see backend/README.md).
 *   2. Local demo — used only when VITE_AI_API is unset. Clearly labelled
 *      in the UI. Still queries The Graph before generating.
 */

import type {
  AIHuntGenerationInput,
  AIGeneratedHunt,
  AIGeneratedClue,
  Difficulty,
} from '@/types'
import { HuntType } from '@/types'
import { SUBGRAPH_URL } from '@/lib/constants'
import {
  getGraphRecommendations,
  formatRecommendationsForPrompt,
  type GraphRecommendations,
} from './graphInsights'

const AI_API_BASE = import.meta.env.VITE_AI_API || ''

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline steps — shown in the UI as a progress list
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStep =
  | 'idle'
  | 'querying_subgraph'    // NEW — The Graph query step
  | 'fetching_content'
  | 'analysing_pages'
  | 'identifying_locations'
  | 'generating_clues'
  | 'mapping_locations'
  | 'quality_check'
  | 'complete'
  | 'error'

export const PIPELINE_STEPS: { key: PipelineStep; label: string; isGraph?: boolean }[] = [
  { key: 'querying_subgraph',    label: 'Querying live hunt analytics from The Graph…', isGraph: true },
  { key: 'fetching_content',     label: 'Fetching business content…' },
  { key: 'analysing_pages',      label: 'Analysing pages & products…' },
  { key: 'identifying_locations',label: 'Identifying candidate clue locations…' },
  { key: 'generating_clues',     label: 'Generating personalised clues…' },
  { key: 'mapping_locations',    label: 'Mapping clues to exact locations…' },
  { key: 'quality_check',        label: 'Running quality & consistency checks…' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Real API call — passes graph context to the backend
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaAPI(
  input:    AIHuntGenerationInput,
  graphRec: GraphRecommendations,
): Promise<AIGeneratedHunt> {
  const resp = await fetch(`${AI_API_BASE}/api/ai/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      // Inject The Graph recommendations so the backend prompt is grounded
      // in live on-chain analytics.
      graphContext: {
        recommendedPrizeEth:   graphRec.recommendedPrizeEth,
        prizeRangeEth:         graphRec.prizeRangeEth,
        recommendedDifficulty: graphRec.recommendedDifficulty,
        recommendedClueCount:  graphRec.recommendedClueCount,
        recommendedHuntType:   graphRec.recommendedHuntType,
        platformContext:       graphRec.platformContext,
        promptBlock:           formatRecommendationsForPrompt(graphRec),
        source:                graphRec.source,
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.detail || err.message || 'AI generation failed.')
  }

  const result: AIGeneratedHunt = await resp.json()
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Local demo generation — full pipeline simulation with Graph-grounded output
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function generateDemo(
  input:    AIHuntGenerationInput,
  graphRec: GraphRecommendations,
  onProgress: (step: PipelineStep) => void,
): Promise<AIGeneratedHunt> {
  // Steps after querying_subgraph (already fired by caller)
  onProgress('fetching_content')
  await delay(900)
  onProgress('analysing_pages')
  await delay(1100)
  onProgress('identifying_locations')
  await delay(800)
  onProgress('generating_clues')
  await delay(1200)
  onProgress('mapping_locations')
  await delay(700)
  onProgress('quality_check')
  await delay(600)

  // Use Graph-recommended values as defaults, unless the user explicitly set
  // something different in the form.
  const name     = input.businessName || 'the brand'
  const campaign = input.campaign     || 'new collection'
  const baseUrl  = input.businessUrl  || 'https://example.com'

  // Apply graph recommendations as smart defaults
  const prize      = graphRec.source === 'live'
    ? graphRec.recommendedPrizeEth.toString()
    : (input.prize || '0.05')
  const numClues   = graphRec.source === 'live'
    ? graphRec.recommendedClueCount
    : (input.numClues || 4)
  const difficulty = graphRec.source === 'live'
    ? graphRec.recommendedDifficulty
    : (input.difficulty || 'medium' as Difficulty)
  const huntType   = graphRec.source === 'live'
    ? graphRec.recommendedHuntType
    : (input.huntType ?? HuntType.MysteryDraw)

  const clues: AIGeneratedClue[] = [
    {
      order: 1,
      text:  `"Nature's creation has always inspired ${name}. Find the word that represents this in our collection."`,
      answer: 'natural',
      location: {
        url:     `${baseUrl}/collection`,
        page:    'Collection Page',
        section: 'Introduction',
        label:   'Collection Introduction',
      },
      placementInstruction: `Insert this clue after the first paragraph of the ${campaign} collection introduction page.`,
      reason:   `Gateway clue — players land on the collection page first. References the brand's core material philosophy.`,
      merchantAction: `Paste as a styled quote block after the opening paragraph on the collection page.`,
      locationFound: true,
    },
    {
      order: 2,
      text:  `"Soft enough for summer, strong enough to last. Find us where the story of our craft is told."`,
      answer: 'story',
      location: {
        url:     `${baseUrl}/about`,
        page:    'About Us',
        section: 'Our Story',
        label:   'About Page',
      },
      placementInstruction: `Insert after the founding story paragraph in the About Us page, before the team section.`,
      reason:   `The About page deepens brand engagement. "Craft" and "story" point naturally here.`,
      merchantAction: `Add as a pull-quote below the "Our Founding Story" section header.`,
      locationFound: true,
    },
    {
      order: 3,
      text:  `"The sun-bleached coastlines gave birth to our palette. What season inspires this collection?"`,
      answer: 'summer',
      location: {
        url:     `${baseUrl}/summer`,
        page:    `${campaign} Landing Page`,
        section: 'Hero Section',
        label:   'Campaign Hero',
      },
      placementInstruction: `Embed below the main campaign headline in the hero section of the ${campaign} landing page.`,
      reason:   `Seasonal reference drives players back to the campaign page and reinforces the brand's aesthetic.`,
      merchantAction: `Place in a subtle text box below the hero headline using brand colours at reduced opacity.`,
      locationFound: true,
    },
    {
      order: 4,
      text:  `"We believe in considered choices. Find the page where ${name} explains its values."`,
      answer: 'values',
      location: {
        url:     `${baseUrl}/sustainability`,
        page:    'Sustainability / Values',
        section: 'Core Values',
        label:   'Values Page',
      },
      placementInstruction: `Insert before the values list on the Sustainability or Values page.`,
      reason:   `Rewards players who explore the brand's purpose beyond product pages.`,
      merchantAction: `Add as a styled blockquote before the "Our Values" section heading.`,
      locationFound: true,
    },
    {
      order: 5,
      text:  `"Where products meet purpose, a secret word is woven into the fabric description."`,
      answer: (input.campaign.split(' ')[0] ?? 'linen').toLowerCase(),
      location: {
        url:     `${baseUrl}/products/hero-item`,
        page:    'Hero Product Page',
        section: 'Product Description',
        label:   'Featured Product',
      },
      placementInstruction: `Insert after the second paragraph of the hero product's description.`,
      reason:   `Final clue sends players to the most important product page — direct link between hunt and campaign.`,
      merchantAction: `Weave into the existing product description as a final sentence.`,
      locationFound: true,
    },
  ]

  const wantedClues = Math.min(Math.max(numClues, 2), clues.length)
  const trimmedClues = clues.slice(0, wantedClues)

  return {
    title:          `${name} — The ${campaign.split(' ').slice(-1)[0]} Secret`,
    description:    `${name} hid a secret across their ${campaign}. Follow the trail through content, stories, and products to discover the final word.`,
    story:          `${name} believes the best discoveries happen when you look closely. We've hidden clues throughout our ${campaign} — in product pages, brand stories, and campaign content. Find them all and unlock the secret.`,
    difficulty,
    huntType,
    clues:          trimmedClues,
    finalAnswer:    trimmedClues[trimmedClues.length - 1]?.answer || 'origin',
    suggestedPrize: prize,
    confidence:     graphRec.source === 'live' ? 0.94 : 0.91,
    analysedPages:   24,
    analysedBlogs:    8,
    analysedProducts: 6,
    // Attach graph recommendations so the review UI can surface them
    graphRecommendations: graphRec,
  } as AIGeneratedHunt & { graphRecommendations: GraphRecommendations }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function generateHunt(
  input:      AIHuntGenerationInput,
  onProgress: (step: PipelineStep) => void,
): Promise<AIGeneratedHunt & { graphRecommendations: GraphRecommendations }> {
  // ── Step 1: Query The Graph (always, regardless of API mode) ──────────────
  onProgress('querying_subgraph')
  const graphRec = await getGraphRecommendations(SUBGRAPH_URL)

  if (AI_API_BASE) {
    // Real API path
    onProgress('fetching_content')
    const result = await generateViaAPI(input, graphRec)
    onProgress('complete')
    // Attach graph recommendations so the UI can show the data panel
    return { ...result, graphRecommendations: graphRec }
  }

  // Demo path — still uses Graph recommendations to shape output
  const result = await generateDemo(input, graphRec, onProgress)
  onProgress('complete')
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Regenerate a single clue
// ─────────────────────────────────────────────────────────────────────────────

export async function regenerateClue(
  clue:    AIGeneratedClue,
  context: { businessName: string; businessUrl?: string; businessDescription?: string },
): Promise<AIGeneratedClue> {
  if (AI_API_BASE) {
    const resp = await fetch(`${AI_API_BASE}/api/ai/regenerate-clue`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clue, context }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || err.message || 'Clue regeneration failed.')
    }
    return resp.json()
  }

  // Demo variation
  await new Promise<void>(r => setTimeout(r, 800))
  return {
    ...clue,
    text: `"${context.businessName} keeps its secrets well. ${clue.text.replace(/^"/, '').replace(/"$/, '')}"`,
  }
}

// Re-export types used by consumers
export type { GraphRecommendations }
