import { keccak256, toHex, encodePacked } from 'viem'

/**
 * Normalise a plaintext answer consistently before hashing.
 *
 * Rules (must exactly mirror the Solidity expectations):
 *  1. Trim leading/trailing whitespace
 *  2. Collapse internal whitespace to single spaces
 *  3. Lowercase
 *
 * This must NEVER change once hunts are live — changing normalisation
 * would break existing answer hashes stored on-chain.
 */
export function normaliseAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/**
 * Hash a raw answer the same way the frontend sends to the contract.
 *
 * Uses keccak256(abi.encodePacked(normalised_answer)) which matches:
 *   keccak256(abi.encodePacked("linen"))  in Solidity tests.
 *
 * @returns bytes32 hex string e.g. "0xabcd..."
 */
export function hashAnswer(raw: string): `0x${string}` {
  const normalised = normaliseAnswer(raw)
  // encodePacked(string) = UTF-8 bytes of the string, no length prefix
  return keccak256(toHex(normalised))
}

/**
 * Verify a candidate answer against a stored on-chain hash.
 * Used client-side before submission to give instant feedback.
 */
export function verifyAnswer(raw: string, storedHash: `0x${string}`): boolean {
  return hashAnswer(raw) === storedHash
}

/**
 * Return a sanitised preview of the answer for the creator review screen.
 * Replaces vowels with * to prevent casual spoilers.
 */
export function spoilerSafe(answer: string): string {
  return normaliseAnswer(answer).replace(/[aeiou]/gi, '•')
}
