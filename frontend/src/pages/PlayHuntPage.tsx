import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  KeyRound, ChevronRight, Lightbulb, CheckCircle, XCircle,
  ExternalLink, Lock, Trophy, Shuffle, Loader2, ArrowLeft,
} from 'lucide-react'
import { useAccount } from 'wagmi'

import { useHunt } from '@/hooks/useHunt'
import { useHuntParticipation, useClueProgress } from '@/hooks/useHunt'
import { useSubmitAnswer } from '@/hooks/useHuntActions'
import { useCloseAndDraw } from '@/hooks/useHuntActions'
import { useUIStore } from '@/store/useAppStore'
import TxButton from '@/components/ui/TxButton'
import TxStatusBanner from '@/components/ui/TxStatusBanner'
import AddressDisplay from '@/components/ui/AddressDisplay'
import { HuntStatus, HuntType, type Clue } from '@/types'
import { cn, formatEth, formatCountdown } from '@/lib/utils'
import { normaliseAnswer } from '@/lib/answerHash'

export default function PlayHuntPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { address } = useAccount()

  const { hunt, isLoading } = useHunt(id)
  const { hasSolved, refetch: refetchParticipation } = useHuntParticipation(id, address)
  const { submitAnswer, txStatus, isPending, advancedClue, wonHunt } = useSubmitAnswer(id)
  const { closeAndDraw, txStatus: drawStatus, isPending: drawPending } = useCloseAndDraw(id)
  const { clueIndex: onChainClueIndex, refetch: refetchClueProgress } = useClueProgress(id, address)

  const { getClueProgress, setClueProgress } = useUIStore()
  // On-chain progress is authoritative; the local store only bridges the gap
  // between "tx confirmed" and the next on-chain read.
  const currentClueIndex = onChainClueIndex ?? getClueProgress(id ?? '')

  const [answer, setAnswer]     = useState('')
  const [showHint, setShowHint] = useState(false)
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [currentClueIndex])

  // Advance clue on correct answer — driven by on-chain events, not guesswork.
  useEffect(() => {
    if (advancedClue === true && id) {
      setLastResult('correct')
      setAnswer('')
      setShowHint(false)

      // Optimistic local bump so the UI moves immediately; the on-chain read
      // (refetched below) is the eventual source of truth.
      setClueProgress(id, currentClueIndex + 1)
      refetchClueProgress()

      if (wonHunt) {
        refetchParticipation()
      } else {
        setTimeout(() => setLastResult(null), 1800)
      }
    }
    if (advancedClue === false) {
      setLastResult('incorrect')
      setTimeout(() => setLastResult(null), 2500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedClue, wonHunt, id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    )
  }

  if (!hunt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-dim">Hunt not found.</p>
        <button onClick={() => navigate('/explore')} className="btn-primary">Explore Hunts</button>
      </div>
    )
  }

  const clues          = hunt.clues ?? []
  const currentClue    = clues[currentClueIndex] as Clue | undefined
  const isLastClue     = currentClueIndex === clues.length - 1
  const isHuntActive   = hunt.status === HuntStatus.Active
  const isCreator      = address?.toLowerCase() === hunt.creator?.toLowerCase()
  const isMystery      = hunt.huntType === HuntType.MysteryDraw
  const progress       = clues.length > 0 ? ((currentClueIndex) / clues.length) * 100 : 0

  const handleSubmit = async () => {
    if (!answer.trim()) return
    await submitAnswer(normaliseAnswer(answer))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // If already solved or all clues done
  const isSolved = hasSolved || hunt.status === HuntStatus.Solved

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-surface">
        <motion.div
          className="h-full bg-gradient-to-r from-gold to-gold-light"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex-1 container-page max-w-2xl py-12 flex flex-col gap-8">
        {/* Back + hunt title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/hunt/${id}`)}
            className="btn-ghost p-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-bright text-lg truncate">{hunt.title}</h2>
            <p className="text-dim text-xs">
              Clue {currentClueIndex + 1} of {clues.length}
              {hunt.endTime ? ` · ${formatCountdown(hunt.endTime)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gold font-bold text-sm">{formatEth(hunt.prize)} ETH</p>
          </div>
        </div>

        {/* ── Solved state ──────────────────────────────────────────────── */}
        {isSolved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-glow p-8 text-center flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-gold" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-bright mb-2">
                {hunt.huntType === HuntType.Race ? '🏆 You Won!' : '✅ You\'re in the Draw!'}
              </h2>
              <p className="text-dim text-sm leading-relaxed">
                {hunt.huntType === HuntType.Race
                  ? `Congratulations! You solved the hunt and won ${formatEth(hunt.prize)} ETH + a Treasure NFT.`
                  : 'Your correct answer has been recorded. Chainlink VRF will select the winner when the hunt closes.'
                }
              </p>
            </div>
            <button onClick={() => navigate(`/hunt/${id}`)} className="btn-secondary text-sm">
              View Hunt Details
            </button>
          </motion.div>
        )}

        {/* ── Active clue ──────────────────────────────────────────────── */}
        {!isSolved && isHuntActive && currentClue && (
          <>
            {/* Clue card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentClueIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card-glow p-8"
              >
                {/* Clue number */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-gold text-xs font-mono font-bold uppercase tracking-wider">
                      Clue {String(currentClueIndex + 1).padStart(2, '0')}
                    </p>
                    {currentClue.location?.label && (
                      <p className="text-muted text-xs">
                        Look in: {currentClue.location.label}
                      </p>
                    )}
                  </div>
                </div>

                {/* Clue text */}
                <blockquote className="font-serif text-xl sm:text-2xl text-bright italic leading-relaxed mb-6">
                  "{currentClue.text}"
                </blockquote>

                {/* Location URL */}
                {currentClue.location?.url && (
                  <a
                    href={currentClue.location.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-arcane-light hover:text-arcane text-sm transition-colors mb-4"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {currentClue.location.page ?? currentClue.location.url}
                  </a>
                )}

                {/* Hint */}
                {currentClue.hint && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="flex items-center gap-2 text-dim hover:text-gold text-sm transition-colors"
                    >
                      <Lightbulb className="w-4 h-4" />
                      {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                    <AnimatePresence>
                      {showHint && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 text-dim text-sm italic pl-6 border-l border-gold/20"
                        >
                          {currentClue.hint}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Answer input */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter your answer..."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isPending}
                  className={cn(
                    'input-field w-full text-lg py-4 pr-14',
                    lastResult === 'correct'   && 'border-success/50 focus:border-success/70',
                    lastResult === 'incorrect' && 'border-danger/50 focus:border-danger/70',
                  )}
                />
                {lastResult && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {lastResult === 'correct'
                      ? <CheckCircle className="w-5 h-5 text-success" />
                      : <XCircle className="w-5 h-5 text-danger" />
                    }
                  </div>
                )}
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      'flex items-center gap-2 text-sm p-3 rounded-xl',
                      lastResult === 'correct'   && 'bg-success/10 text-success',
                      lastResult === 'incorrect' && 'bg-danger/10 text-danger',
                    )}
                  >
                    {lastResult === 'correct'
                      ? <><CheckCircle className="w-4 h-4" /> Correct! Moving to the next clue...</>
                      : <><XCircle className="w-4 h-4" /> That's not it. Keep searching.</>
                    }
                  </motion.div>
                )}
              </AnimatePresence>

              <TxButton
                onClick={handleSubmit}
                txState={txStatus.state}
                isPending={isPending}
                disabled={!answer.trim()}
                className="w-full justify-center py-4"
              >
                Submit Answer
                <ChevronRight className="w-4 h-4" />
              </TxButton>

              <TxStatusBanner status={txStatus} />

              <p className="text-center text-muted text-xs">
                Your answer is hashed before submission. The plaintext is never stored on-chain.
              </p>
            </div>

            {/* Clue progress dots */}
            {clues.length > 1 && (
              <div className="flex justify-center gap-2">
                {clues.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i < currentClueIndex  && 'bg-gold',
                      i === currentClueIndex && 'bg-gold w-4',
                      i > currentClueIndex  && 'bg-border',
                    )}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Creator controls (Mystery Draw) ──────────────────────────── */}
        {isCreator && isMystery && isHuntActive && (
          <div className="card p-5 border-arcane/20">
            <h3 className="font-semibold text-bright mb-2 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-arcane-light" />
              Creator Controls
            </h3>
            <p className="text-dim text-sm mb-4">
              {hunt.correctCount} correct solver{hunt.correctCount !== 1 ? 's' : ''} so far.
              Close the hunt to trigger the Chainlink VRF draw.
            </p>
            <TxButton
              onClick={() => { void closeAndDraw() }}
              txState={drawStatus.state}
              isPending={drawPending}
              disabled={hunt.correctCount === 0}
              variant="arcane"
              className="w-full justify-center"
            >
              <Shuffle className="w-4 h-4" />
              Close Hunt & Request Draw
            </TxButton>
            <TxStatusBanner status={drawStatus} className="mt-3" />
            {hunt.correctCount === 0 && (
              <p className="text-muted text-xs mt-2 text-center">
                No correct solvers yet. Wait for entries before closing.
              </p>
            )}
          </div>
        )}

        {/* Hunt expired / inactive */}
        {!isHuntActive && !isSolved && (
          <div className="card p-6 text-center">
            <Lock className="w-8 h-8 text-muted mx-auto mb-3" />
            <h3 className="font-semibold text-bright mb-1">Hunt Closed</h3>
            <p className="text-dim text-sm">This hunt is no longer accepting submissions.</p>
            <button onClick={() => navigate('/explore')} className="btn-secondary mt-4 text-sm">
              Find another hunt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
