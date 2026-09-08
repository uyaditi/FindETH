import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import {
  resolveENSName,
  resolveENSAvatar,
  batchResolveENS,
  formatIdentity,
} from '@/services/ens'

// ─────────────────────────────────────────────────────────────────────────────
// useENSName — resolve ENS name for a single address
// ─────────────────────────────────────────────────────────────────────────────

export function useENSName(address: string | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address) { setEnsName(null); return }
    setIsLoading(true)
    resolveENSName(address)
      .then(name => { setEnsName(name); setIsLoading(false) })
      .catch(() => { setEnsName(null); setIsLoading(false) })
  }, [address])

  return {
    ensName,
    isLoading,
    display: formatIdentity(address ?? '', ensName),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useENSAvatar — resolve avatar for a name or address
// ─────────────────────────────────────────────────────────────────────────────

export function useENSAvatar(nameOrAddress: string | undefined) {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!nameOrAddress) { setAvatar(null); return }
    setIsLoading(true)
    resolveENSAvatar(nameOrAddress)
      .then(url => { setAvatar(url); setIsLoading(false) })
      .catch(() => { setAvatar(null); setIsLoading(false) })
  }, [nameOrAddress])

  return { avatar, isLoading }
}

// ─────────────────────────────────────────────────────────────────────────────
// useCurrentUserENS — ENS for the connected wallet
// ─────────────────────────────────────────────────────────────────────────────

export function useCurrentUserENS() {
  const { address } = useAccount()
  const { ensName, isLoading, display } = useENSName(address)
  const { avatar } = useENSAvatar(address)

  return { address, ensName, display, avatar, isLoading }
}

// ─────────────────────────────────────────────────────────────────────────────
// useBatchENS — resolve ENS names for a list of addresses
// ─────────────────────────────────────────────────────────────────────────────

export function useBatchENS(addresses: string[]) {
  const [names, setNames] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(false)

  const key = addresses.sort().join(',')

  useEffect(() => {
    if (addresses.length === 0) return
    setIsLoading(true)
    batchResolveENS(addresses)
      .then(result => { setNames(result); setIsLoading(false) })
      .catch(() => { setIsLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { names, isLoading }
}
