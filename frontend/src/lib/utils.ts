import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatEther } from 'viem'

/** Merge Tailwind class names safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shorten an Ethereum address */
export function shortAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/** Format wei to human-readable ETH string */
export function formatEth(wei: bigint | string | number, decimals = 4): string {
  const value = typeof wei === 'bigint' ? wei : BigInt(wei)
  const eth = formatEther(value)
  const num = parseFloat(eth)
  if (num === 0) return '0'
  if (num < 0.0001) return '< 0.0001'
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

/** Format a timestamp to a readable date */
export function formatDate(timestamp: number | bigint): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Format a relative countdown */
export function formatCountdown(endTime: number): string {
  const now  = Math.floor(Date.now() / 1000)
  const diff = endTime - now
  if (diff <= 0) return 'Ended'

  const days    = Math.floor(diff / 86400)
  const hours   = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (days > 0)    return `${days}d ${hours}h left`
  if (hours > 0)   return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

/** Normalise answer before hashing */
export function normaliseAnswer(answer: string): string {
  return answer.trim().toLowerCase()
}

/** Validate an Ethereum address */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

/** Delay helper for animations */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Truncate text with ellipsis */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Parse error message from unknown error */
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    // Common wallet error messages
    if (error.message.includes('User rejected') || error.message.includes('user rejected'))
      return 'Transaction cancelled.'
    if (error.message.includes('insufficient funds'))
      return "You don't have enough ETH to complete this transaction."
    if (error.message.includes('nonce'))
      return 'Transaction conflict. Please try again.'
    return error.message
  }
  return 'An unexpected error occurred.'
}

/** Difficulty label map */
export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
  expert: 'Expert',
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   'text-success',
  medium: 'text-gold',
  hard:   'text-arcane-light',
  expert: 'text-danger',
}

/** Hunt type label */
export const HUNT_TYPE_LABELS: Record<number, string> = {
  0: 'Race',
  1: 'Mystery Draw',
}
