/**
 * Hunt Metadata API Client
 *
 * Talks to the FastAPI backend (backend/) that stores hunt flavor text
 * (title, description, clue text/hints/locations) in Postgres.
 *
 * Deliberately never sends or receives a clue's plaintext `answer` — the
 * answer hash already lives immutably on-chain per clue index, and the
 * backend has no column for it at all. Only the creator's own browser ever
 * sees clue answers, during the pre-publish review step.
 */

import { Difficulty } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface HuntMetadataClue {
  order: number
  text: string
  hint?: string
  url?: string
  page?: string
  section?: string
  label?: string
}

export interface HuntMetadata {
  huntId: string
  title: string
  description?: string
  story?: string
  difficulty: Difficulty
  category?: string
  tags?: string[]
  clues: HuntMetadataClue[]
  isBusiness?: boolean
  businessName?: string
  businessLogo?: string
  businessAccent?: string
  isAiGenerated?: boolean
  aiConfidence?: number
  creator?: string
}

/** Canonical message the creator's wallet signs to prove ownership of a hunt before publishing metadata. */
export function metadataPublishMessage(huntId: string): string {
  return `Publish metadata for hunt ${huntId}`
}

/**
 * Save hunt metadata to the backend. Requires a signature (from the creator's
 * wallet, over `metadataPublishMessage(huntId)`) so the backend can verify the
 * signer matches the hunt's on-chain creator before accepting the write —
 * without this, anyone could overwrite anyone else's hunt metadata.
 */
export async function saveHuntMetadata(
  metadata: Omit<HuntMetadata, 'clues'> & { clues: HuntMetadataClue[] },
  signature: `0x${string}`
): Promise<void> {
  // huntId is part of the URL, not the body — the backend's schema forbids
  // unrecognised fields, so sending it in the body would 422.
  const { huntId, ...body } = metadata

  const response = await fetch(`${API_URL}/hunts/${huntId}/metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, signature }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `Failed to save metadata: ${response.statusText}`)
  }
}

// The backend returns huntId as a JSON number (it's a Postgres bigint); the
// rest of the frontend treats hunt IDs as strings (bigint-safe, matches route
// params), so every response is normalised here.
function normaliseMetadata(raw: any): HuntMetadata {
  return { ...raw, huntId: String(raw.huntId) }
}

/**
 * Get hunt metadata from the backend.
 */
export async function getHuntMetadata(huntId: string): Promise<HuntMetadata | null> {
  try {
    const response = await fetch(`${API_URL}/hunts/${huntId}/metadata`)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    return normaliseMetadata(await response.json())
  } catch (error) {
    console.warn('Failed to load hunt metadata:', error)
    return null
  }
}

/**
 * Get all hunt metadata (used to merge titles/descriptions into the Explore page).
 */
export async function getAllHuntMetadata(): Promise<HuntMetadata[]> {
  try {
    const response = await fetch(`${API_URL}/hunts`)

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const list = await response.json()
    return (list as any[]).map(normaliseMetadata)
  } catch (error) {
    console.warn('Failed to load all hunt metadata:', error)
    return []
  }
}
