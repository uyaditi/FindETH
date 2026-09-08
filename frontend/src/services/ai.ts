/**
 * AI Hunt Generation Service
 *
 * Architecture:
 *   Frontend → POST /api/ai/generate → AI backend (OpenAI / Anthropic)
 *                                    → content discovery + extraction
 *                                    → hunt draft
 *
 * For the hackathon MVP, this module provides:
 *   1. A real API call path (when VITE_AI_API is set)
 *   2. A detailed local simulation that demonstrates the full pipeline
 *      without requiring an AI backend to be running.
 *
 * The simulation is clearly labelled as such in the UI — no faking.
 */

import type {
  AIHuntGenerationInput,
  AIGeneratedHunt,
  AIGeneratedClue,
  Difficulty,
} from '@/types'
import { HuntType } from '@/types'

const AI_API_BASE = import.meta.env.VITE_AI_API || ''

// ─────────────────────────────────────────────────────────────────────────────
// Generation pipeline steps (used for streaming progress UI)
// ─────────────────────────────────────────────────────────────────────────────

export type PipelineStep =
  | 'idle'
  | 'fetching_content'
  | 'analysing_pages'
  | 'identifying_locations'
  | 'generating_clues'
  | 'mapping_locations'
  | 'quality_check'
  | 'complete'
  | 'error'

export const PIPELINE_STEPS: { key: PipelineStep; label: string }[] = [
  { key: 'fetching_content',      label: 'Fetching business content...' },
  { key: 'analysing_pages',       label: 'Analysing pages & products...' },
  { key: 'identifying_locations', label: 'Identifying candidate clue locations...' },
  { key: 'generating_clues',      label: 'Generating personalised clues...' },
  { key: 'mapping_locations',     label: 'Mapping clues to exact locations...' },
  { key: 'quality_check',         label: 'Running quality & consistency checks...' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Real API call
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaAPI(input: AIHuntGenerationInput): Promise<AIGeneratedHunt> {
  const resp = await fetch(`${AI_API_BASE}/api/ai/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err.message || 'AI generation failed.')
  }

  return resp.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Local demo generation — demonstrates the full pipeline with realistic output
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function generateDemo(
  input: AIHuntGenerationInput,
  onProgress: (step: PipelineStep) => void
): Promise<AIGeneratedHunt> {
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

  // Generate contextual clues based on the business input
  const name     = input.businessName || 'the brand'
  const campaign = input.campaign || 'new collection'
  const btype    = input.businessType || 'business'
  const baseUrl  = input.businessUrl || 'https://example.com'

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
      reason:   `This is the gateway clue. Players naturally land on the collection page first, and the clue references the brand's core material philosophy.`,
      merchantAction: `Copy the clue text and paste it as a styled quote block after the opening paragraph on the collection page.`,
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
      reason:   `The About page deepens brand engagement. The clue's reference to "craft" and "story" is a natural pointer toward this page.`,
      merchantAction: `Add the clue text as a pull-quote below the "Our Founding Story" section header.`,
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
      reason:   `The seasonal reference drives players back to the campaign page and reinforces the brand's summer aesthetic.`,
      merchantAction: `Place the clue in a subtle text box below the hero headline. Use brand colours with reduced opacity so it reads as flavour text.`,
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
      reason:   `This clue encourages brand discovery beyond the product pages and rewards players who explore the brand's purpose.`,
      merchantAction: `Add as a styled blockquote before the "Our Values" section heading.`,
      locationFound: true,
    },
    {
      order: 5,
      text:  `"Where products meet purpose, a secret word is woven into the fabric description."`,
      answer: input.campaign.split(' ')[0]?.toLowerCase() || 'linen',
      location: {
        url:     `${baseUrl}/products/hero-item`,
        page:    'Hero Product Page',
        section: 'Product Description',
        label:   'Featured Product',
      },
      placementInstruction: `Insert after the second paragraph of the hero product's description. The word should appear naturally in the product copy.`,
      reason:   `The final clue sends players to the most important product page. It creates a direct connection between the hunt and the product the campaign is promoting.`,
      merchantAction: `Weave the clue into the existing product description as a final sentence: "Hidden in plain sight: ${(input.campaign.split(' ')[0] || 'linen').toLowerCase()}"`,
      locationFound: true,
    },
  ]

  return {
    title:          `${name} — The ${campaign.split(' ').slice(-1)[0]} Secret`,
    description:    `${name} hid a secret across their ${campaign}. Follow the trail through content, stories, and products to discover the final word.`,
    story:          `${name} believes the best discoveries happen when you look closely. We've hidden clues throughout our ${campaign} — in product pages, brand stories, and campaign content. Find them all and unlock the secret.`,
    difficulty:     input.difficulty,
    huntType:       input.huntType,
    clues,
    finalAnswer:    'origin',
    suggestedPrize: input.prize || '0.05',
    confidence:     0.91,
    analysedPages:   24,
    analysedBlogs:    8,
    analysedProducts: 6,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function generateHunt(
  input: AIHuntGenerationInput,
  onProgress: (step: PipelineStep) => void
): Promise<AIGeneratedHunt> {
  if (AI_API_BASE) {
    // Real API path — progress is simulated since streaming isn't wired
    onProgress('fetching_content')
    const result = await generateViaAPI(input)
    onProgress('complete')
    return result
  }

  // Demo path
  const result = await generateDemo(input, onProgress)
  onProgress('complete')
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Regenerate a single clue
// ─────────────────────────────────────────────────────────────────────────────

export async function regenerateClue(
  clue: AIGeneratedClue,
  context: { businessName: string; businessUrl: string }
): Promise<AIGeneratedClue> {
  if (AI_API_BASE) {
    const resp = await fetch(`${AI_API_BASE}/api/ai/regenerate-clue`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clue, context }),
    })
    if (!resp.ok) throw new Error('Clue regeneration failed.')
    return resp.json()
  }

  // Demo: return a variation
  await delay(800)
  return {
    ...clue,
    text: `"${context.businessName} keeps its secrets well. ${clue.text.replace(/^"/, '').replace(/"$/, '')}"`,
  }
}
