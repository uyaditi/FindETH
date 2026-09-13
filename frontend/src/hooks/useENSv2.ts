/**
 * useENSv2.ts
 *
 * React hooks for the ENSv2 subname flow:
 *   - useRegisterBrandNamespace  — one tx to claim {slug}.treasurehunts.eth
 *   - useRegisterHuntSubname     — one tx to claim hunt-{id}.{slug}.treasurehunts.eth
 *   - useRegisterAgentSubname    — register + scoped text authorization
 *   - useSetResolverRecords      — batch setText calls (sequenced)
 *   - useHuntSubnameRecords      — live-reads all text records for a hunt node
 *   - useBrandSubnameRecords     — live-reads brand namespace records
 *   - useSubnameExists           — polls ETHRegistry to check if label is taken
 *   - useAgentWriterRole         — checks if an address has WRITER_ROLE
 *
 * All write hooks return { write, status, txHash, error, isPending } so they
 * slot in beside the existing useCreateHunt / TxButton pattern.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useAccount,
} from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { sepolia } from 'viem/chains'

import {
  buildRegisterBrandNamespace,
  buildSetBrandRecords,
  buildRegisterHuntSubname,
  buildSetHuntRecords,
  buildRegisterAgentSubname,
  buildSetAgentRecords,
  readHuntSubnameRecords,
  readBrandSubnameRecords,
  readAgentSubnameRecords,
  checkSubnameExists,
  getBrandSubregistry,
  checkAgentHasWriterRole,
  type SubnameRecord,
  type ContractWriteArgs,
} from '@/services/ensSubnames'
import {
  toBrandSlug,
  type HuntENSMetadata,
  type BrandENSMetadata,
  type AgentENSMetadata,
} from '@/lib/ensv2'

// ─────────────────────────────────────────────────────────────────────────────
// Generic single-write hook
// ─────────────────────────────────────────────────────────────────────────────

type TxStatus = 'idle' | 'confirming' | 'pending' | 'success' | 'error'

function useSingleWrite() {
  const { writeContractAsync, isPending } = useWriteContract()
  const [hash,   setHash]   = useState<`0x${string}` | undefined>()
  const [status, setStatus] = useState<TxStatus>('idle')
  const [error,  setError]  = useState<string | null>(null)

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  })

  useEffect(() => {
    if (isSuccess)    setStatus('success')
    if (isConfirming) setStatus('pending')
  }, [isSuccess, isConfirming])

  const execute = useCallback(async (args: ContractWriteArgs) => {
    setError(null)
    setStatus('confirming')
    try {
      const txHash = await writeContractAsync(args as any)
      setHash(txHash)
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed')
      setStatus('error')
    }
  }, [writeContractAsync])

  return { execute, status, txHash: hash, error, isPending: isPending || isConfirming }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic sequential batch writer (for multiple setText calls)
// ─────────────────────────────────────────────────────────────────────────────

function useSequentialWrite() {
  const { writeContractAsync } = useWriteContract()
  const [status,     setStatus]     = useState<TxStatus>('idle')
  const [error,      setError]      = useState<string | null>(null)
  const [lastHash,   setLastHash]   = useState<`0x${string}` | undefined>()
  const [progress,   setProgress]   = useState(0)   // 0–total
  const [total,      setTotal]      = useState(0)

  const executeAll = useCallback(async (argsList: ContractWriteArgs[]) => {
    if (argsList.length === 0) return
    setError(null)
    setStatus('confirming')
    setProgress(0)
    setTotal(argsList.length)

    try {
      for (let i = 0; i < argsList.length; i++) {
        const h = await writeContractAsync(argsList[i] as any)
        setLastHash(h)
        setProgress(i + 1)
      }
      setStatus('success')
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Transaction failed')
      setStatus('error')
    }
  }, [writeContractAsync])

  return { executeAll, status, lastHash, error, progress, total }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain guard — hooks warn if not on Sepolia
// ─────────────────────────────────────────────────────────────────────────────

export function useIsOnSepolia(): boolean {
  const chainId = useChainId()
  return chainId === sepolia.id
}

// ─────────────────────────────────────────────────────────────────────────────
// useRegisterBrandNamespace
// Tx 1: ETHRegistry.register(slug, owner, expiry, resolver)
// Tx 2+: PermissionedResolver.setText × N records
// ─────────────────────────────────────────────────────────────────────────────

export function useRegisterBrandNamespace() {
  const registerWrite = useSingleWrite()
  const recordsWrite  = useSequentialWrite()
  const { address }   = useAccount()

  const register = useCallback(async (
    brandName: string,
    metadata:  BrandENSMetadata,
  ) => {
    if (!address) return
    const slug = toBrandSlug(brandName)

    // Step 1 — register the namespace subname
    await registerWrite.execute(
      buildRegisterBrandNamespace(brandName, address)
    )
    if (registerWrite.status === 'error') return

    // Step 2 — write brand records to the PermissionedResolver
    await recordsWrite.executeAll(
      buildSetBrandRecords(slug, metadata)
    )
  }, [address, registerWrite, recordsWrite])

  return {
    register,
    registerStatus: registerWrite.status,
    recordsStatus:  recordsWrite.status,
    error:          registerWrite.error ?? recordsWrite.error,
    isPending:      registerWrite.isPending || recordsWrite.status === 'confirming',
    registerTxHash: registerWrite.txHash,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useRegisterHuntSubname
// Tx 1:  registry.register(huntLabel, owner, expiry, resolver)
// Tx 2+: resolver.setText × N hunt metadata records
// ─────────────────────────────────────────────────────────────────────────────

export function useRegisterHuntSubname() {
  const registerWrite = useSingleWrite()
  const recordsWrite  = useSequentialWrite()
  const { address }   = useAccount()

  const register = useCallback(async (
    huntId:    string | number,
    brandSlug: string,
    metadata:  HuntENSMetadata,
  ) => {
    if (!address) return

    // Step 1 — register hunt-{id}.{slug}.treasurehunts.eth
    const brandRegistry = await getBrandSubregistry(brandSlug)
    await registerWrite.execute(buildRegisterHuntSubname(huntId, brandSlug, address, brandRegistry))
    if (registerWrite.status === 'error') return

    // Step 2 — write hunt metadata to the PermissionedResolver
    await recordsWrite.executeAll(
      buildSetHuntRecords(huntId, brandSlug, metadata)
    )
  }, [address, registerWrite, recordsWrite])

  return {
    register,
    registerStatus: registerWrite.status,
    recordsStatus:  recordsWrite.status,
    recordsProgress: recordsWrite.progress,
    recordsTotal:    recordsWrite.total,
    error:           registerWrite.error ?? recordsWrite.error,
    isPending:       registerWrite.isPending || recordsWrite.status === 'confirming',
    registerTxHash:  registerWrite.txHash,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useRegisterAgentSubname
// Tx 1: registry.register(agentLabel, owner, expiry, resolver)
// Tx 2: resolver.grantRole(WRITER_ROLE, agentAddress)
// Tx 3+: resolver.setText × N agent metadata records
// ─────────────────────────────────────────────────────────────────────────────

export function useRegisterAgentSubname() {
  const registerBatch = useSequentialWrite()   // register + grantRole
  const recordsWrite  = useSequentialWrite()   // setText × N
  const { address }   = useAccount()

  const register = useCallback(async (
    huntId:       string | number,
    brandSlug:    string,
    agentAddress: `0x${string}`,
    metadata:     AgentENSMetadata,
  ) => {
    if (!address) return

    // Steps 1+2: register subname + grant WRITER_ROLE in one sequential batch
    const brandRegistry = await getBrandSubregistry(brandSlug)
    await registerBatch.executeAll(buildRegisterAgentSubname(huntId, brandSlug, address, agentAddress, brandRegistry))
    if (registerBatch.status === 'error') return

    // Step 3+: write agent identity records
    await recordsWrite.executeAll(
      buildSetAgentRecords(huntId, brandSlug, metadata)
    )
  }, [address, registerBatch, recordsWrite])

  return {
    register,
    status:   registerBatch.status !== 'success' ? registerBatch.status : recordsWrite.status,
    error:    registerBatch.error ?? recordsWrite.error,
    isPending: registerBatch.status === 'confirming' || recordsWrite.status === 'confirming',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSetResolverRecords — standalone batch setText (for updating existing names)
// ─────────────────────────────────────────────────────────────────────────────

export function useSetResolverRecords() {
  const { executeAll, status, error, progress, total } = useSequentialWrite()

  const setRecords = useCallback(
    (args: ContractWriteArgs[]) => executeAll(args),
    [executeAll]
  )

  return { setRecords, status, error, progress, total }
}

// ─────────────────────────────────────────────────────────────────────────────
// useHuntSubnameRecords — read live resolver records for a hunt node
// ─────────────────────────────────────────────────────────────────────────────

export function useHuntSubnameRecords(
  huntId:    string | undefined,
  brandSlug: string | undefined,
) {
  const { data, isLoading, isError, refetch } = useQuery<SubnameRecord>({
    queryKey:  ['ensv2', 'hunt', huntId, brandSlug],
    queryFn:   () => readHuntSubnameRecords(huntId!, brandSlug!),
    enabled:   !!huntId && !!brandSlug,
    staleTime: 30_000,
    retry:     1,
  })

  return {
    record:    data ?? null,
    exists:    data?.exists ?? false,
    records:   data?.records ?? {},
    isLoading,
    isError,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useBrandSubnameRecords — read brand namespace resolver records
// ─────────────────────────────────────────────────────────────────────────────

export function useBrandSubnameRecords(brandSlug: string | undefined) {
  const { data, isLoading, isError, refetch } = useQuery<SubnameRecord>({
    queryKey:  ['ensv2', 'brand', brandSlug],
    queryFn:   () => readBrandSubnameRecords(brandSlug!),
    enabled:   !!brandSlug,
    staleTime: 30_000,
    retry:     1,
  })

  return {
    record:    data ?? null,
    exists:    data?.exists ?? false,
    records:   data?.records ?? {},
    isLoading,
    isError,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAgentSubnameRecords — read agent subname resolver records
// ─────────────────────────────────────────────────────────────────────────────

export function useAgentSubnameRecords(
  huntId:    string | undefined,
  brandSlug: string | undefined,
) {
  const { data, isLoading, isError } = useQuery<SubnameRecord>({
    queryKey:  ['ensv2', 'agent', huntId, brandSlug],
    queryFn:   () => readAgentSubnameRecords(huntId!, brandSlug!),
    enabled:   !!huntId && !!brandSlug,
    staleTime: 60_000,
    retry:     1,
  })

  return {
    record:  data ?? null,
    exists:  data?.exists ?? false,
    records: data?.records ?? {},
    isLoading,
    isError,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubnameExists — check if a label is already taken in the ETHRegistry
// ─────────────────────────────────────────────────────────────────────────────

export function useSubnameExists(label: string | undefined) {
  const { data, isLoading } = useQuery<boolean>({
    queryKey:  ['ensv2', 'exists', label],
    queryFn:   () => checkSubnameExists(label!),
    enabled:   !!label && label.length > 0,
    staleTime: 15_000,
    retry:     1,
  })

  return { exists: data ?? false, isLoading }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAgentWriterRole — check if an address has WRITER_ROLE on the resolver
// ─────────────────────────────────────────────────────────────────────────────

export function useAgentWriterRole(agentAddress: `0x${string}` | undefined) {
  const { data, isLoading } = useQuery<boolean>({
    queryKey:  ['ensv2', 'writerRole', agentAddress],
    queryFn:   () => checkAgentHasWriterRole(agentAddress!),
    enabled:   !!agentAddress,
    staleTime: 30_000,
    retry:     1,
  })

  return { hasRole: data ?? false, isLoading }
}
