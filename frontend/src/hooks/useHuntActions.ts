import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, keccak256, toHex } from 'viem'
import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

import { TREASURE_HUNT_ABI } from '@/contracts/abis'
import { getAddresses } from '@/contracts/addresses'
import { hashAnswer } from '@/lib/answerHash'
import { parseError } from '@/lib/utils'
import type { TxStatus } from '@/types'
import { HuntType } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// useCreateHunt — publish a hunt on-chain
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateHunt() {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  const { writeContractAsync, isPending } = useWriteContract()
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: 'idle' })
  const [txHash, setTxHash]     = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const createHunt = useCallback(async (params: {
    finalAnswer: string
    huntType:    HuntType
    endTime:     number   // unix timestamp, 0 = no deadline
    prizeEth:    string   // "0.05"
  }) => {
    try {
      setTxStatus({ state: 'confirming', message: 'Waiting for wallet confirmation...' })

      const answerHash = hashAnswer(params.finalAnswer)
      const prizeWei   = parseEther(params.prizeEth)

      const hash = await writeContractAsync({
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'createHunt',
        args:         [answerHash, params.huntType, BigInt(params.endTime)],
        value:        prizeWei,
      })

      setTxHash(hash)
      setTxStatus({ state: 'pending', hash, message: 'Transaction submitted. Waiting for confirmation...' })
      toast.loading('Publishing hunt...', { id: 'create-hunt' })

      return hash
    } catch (err) {
      const msg = parseError(err)
      setTxStatus({ state: 'error', error: msg })
      toast.error(msg, { id: 'create-hunt' })
      throw err
    }
  }, [addresses, writeContractAsync])

  // When confirmed
  if (isSuccess && txStatus.state === 'pending') {
    setTxStatus({ state: 'success', hash: txHash, message: 'Hunt published successfully!' })
    toast.success('Hunt is live!', { id: 'create-hunt' })
  }

  return {
    createHunt,
    txStatus,
    isPending: isPending || isConfirming,
    isSuccess,
    txHash,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubmitAnswer — player submits an answer
// ─────────────────────────────────────────────────────────────────────────────

export function useSubmitAnswer(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  const { writeContractAsync, isPending } = useWriteContract()
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: 'idle' })
  const [txHash, setTxHash]     = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const submitAnswer = useCallback(async (rawAnswer: string) => {
    if (!huntId) return
    try {
      setTxStatus({ state: 'confirming', message: 'Waiting for wallet confirmation...' })

      const answerHash = hashAnswer(rawAnswer)

      const hash = await writeContractAsync({
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'submitAnswer',
        args:         [BigInt(huntId), answerHash],
      })

      setTxHash(hash)
      setTxStatus({ state: 'pending', hash, message: 'Submitting answer...' })
      toast.loading('Verifying on-chain...', { id: 'submit-answer' })

      return hash
    } catch (err) {
      const msg = parseError(err)
      setTxStatus({ state: 'error', error: msg })
      toast.dismiss('submit-answer')
      throw err
    }
  }, [huntId, addresses, writeContractAsync])

  // Detect correct vs incorrect from receipt events
  const wasCorrect = isSuccess && receipt
    ? receipt.logs.some(log => {
        // CorrectSolution event topic0
        try {
          return log.topics[0] === keccak256(toHex('CorrectSolution(uint256,address,uint256)'))
        } catch { return false }
      })
    : undefined

  if (isSuccess && txStatus.state === 'pending') {
    if (wasCorrect) {
      setTxStatus({ state: 'success', hash: txHash, message: 'Correct! Your answer was accepted.' })
      toast.success('Correct answer!', { id: 'submit-answer' })
    } else if (wasCorrect === false) {
      setTxStatus({ state: 'success', hash: txHash, message: "That's not it. Keep searching." })
      toast.error("That's not it. Keep searching.", { id: 'submit-answer', duration: 4000 })
    } else {
      setTxStatus({ state: 'success', hash: txHash })
      toast.dismiss('submit-answer')
    }
  }

  return {
    submitAnswer,
    txStatus,
    isPending: isPending || isConfirming,
    isSuccess,
    wasCorrect,
    txHash,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useCloseAndDraw — creator closes mystery draw + requests VRF
// ─────────────────────────────────────────────────────────────────────────────

export function useCloseAndDraw(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  const { writeContractAsync, isPending } = useWriteContract()
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: 'idle' })
  const [txHash, setTxHash]     = useState<`0x${string}` | undefined>()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const closeAndDraw = useCallback(async () => {
    if (!huntId) return
    try {
      setTxStatus({ state: 'confirming', message: 'Waiting for wallet confirmation...' })

      const hash = await writeContractAsync({
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'closeAndRequestDraw',
        args:         [BigInt(huntId)],
      })

      setTxHash(hash)
      setTxStatus({ state: 'pending', hash, message: 'Requesting Chainlink VRF randomness...' })
      toast.loading('Requesting randomness...', { id: 'close-draw' })

      return hash
    } catch (err) {
      const msg = parseError(err)
      setTxStatus({ state: 'error', error: msg })
      toast.error(msg, { id: 'close-draw' })
      throw err
    }
  }, [huntId, addresses, writeContractAsync])

  if (isSuccess && txStatus.state === 'pending') {
    setTxStatus({ state: 'success', hash: txHash, message: 'Draw requested. Awaiting Chainlink VRF...' })
    toast.success('Randomness requested!', { id: 'close-draw' })
  }

  return { closeAndDraw, txStatus, isPending: isPending || isConfirming, isSuccess }
}

// ─────────────────────────────────────────────────────────────────────────────
// useCancelHunt — creator cancels hunt before any solver
// ─────────────────────────────────────────────────────────────────────────────

export function useCancelHunt(huntId: string | undefined) {
  const chainId   = useChainId()
  const addresses = getAddresses(chainId)

  const { writeContractAsync, isPending } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const cancelHunt = useCallback(async () => {
    if (!huntId) return
    try {
      const hash = await writeContractAsync({
        address:      addresses.TREASURE_HUNT,
        abi:          TREASURE_HUNT_ABI,
        functionName: 'cancelHunt',
        args:         [BigInt(huntId)],
      })
      setTxHash(hash)
      toast.loading('Cancelling hunt...', { id: 'cancel-hunt' })
      return hash
    } catch (err) {
      toast.error(parseError(err))
      throw err
    }
  }, [huntId, addresses, writeContractAsync])

  if (isSuccess) {
    toast.success('Hunt cancelled. Prize refunded.', { id: 'cancel-hunt' })
  }

  return { cancelHunt, isPending, isSuccess }
}
