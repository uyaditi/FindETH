import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Trophy, Clock, Zap, Shuffle, ShieldCheck, ExternalLink,
  Share2, Copy, CheckCheck, Sparkles, Lock, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { formatEther } from 'viem'

import { useHunt } from '@/hooks/useHunt'
import { useHuntParticipation } from '@/hooks/useHunt'
import { useHuntNFT } from '@/hooks/useNFT'
import AddressDisplay from '@/components/ui/AddressDisplay'
import TxButton from '@/components/ui/TxButton'
import { HuntCardSkeleton } from '@/components/ui/Skeleton'
import { HuntStatus, HuntType } from '@/types'
import {
  cn, formatEth, formatDate, formatCountdown,
  DIFFICULTY_LABELS, DIFFICULTY_COLORS, HUNT_TYPE_LABELS,
  copyToClipboard,
} from '@/lib/utils'

export default function HuntDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const chainId   = useChainId()
  const { address } = useAccount()

  const { hunt, isLoading } = useHunt(id)
  const { hasParticipated, hasSolved } = useHuntParticipation(id, address)
  const { trophy, hasNFT, tokenId } = useHuntNFT(id)

  const [copied, setCopied] = useState(false)

  if (isLoading) {
    return (
      <div className="container-page py-12 max-w-4xl">
        <HuntCardSkeleton />
      </div>
    )
  }

  if (!hunt) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-5xl mb-4">🗝️</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Hunt not found</h2>
        <p className="text-dim mb-6">This hunt doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/explore')} className="btn-primary">
          Browse Hunts
        </button>
      </div>
    )
  }

  const isActive  = hunt.status === HuntStatus.Active
  const isSolved  = hunt.status === HuntStatus.Solved
  const isClosed  = hunt.status === HuntStatus.Closed
  const isExpired = hunt.endTime && hunt.endTime < Math.floor(Date.now() / 1000)
  const canPlay   = isActive && !isExpired

  const huntUrl = `${window.location.origin}/hunt/${hunt.id}`

  const handleCopy = async () => {
    await copyToClipboard(huntUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container-page py-12 max-w-5xl animate-fade-in">
      {/* Business branding banner */}
      {hunt.isBusiness && hunt.businessName && (
        <div className="card mb-6 p-4 flex items-center gap-3 border-gold/20">
          {hunt.businessLogo && <span className="text-2xl">{hunt.businessLogo}</span>}
          <div>
            <p className="text-bright font-semibold">{hunt.businessName}</p>
            <p className="text-dim text-xs">Powered by Internet Treasure Hunts</p>
          </div>
          {hunt.isAiGenerated && (
            <span className="badge badge-arcane ml-auto">
              <Sparkles className="w-3 h-3" /> AI Generated
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Main content ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Title & status */}
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn(
                    'badge',
                    isActive  && 'badge-green',
                    isSolved  && 'badge-gray',
                    isClosed  && 'badge-gold',
                  )}>
                    {isActive ? 'Live' : isSolved ? 'Solved' : isClosed ? 'Draw Pending' : 'Ended'}
                  </span>
                  <span className={cn('badge', DIFFICULTY_COLORS[hunt.difficulty])}>
                    {DIFFICULTY_LABELS[hunt.difficulty]}
                  </span>
                  <span className="badge badge-gray flex items-center gap-1">
                    {hunt.huntType === HuntType.Race
                      ? <><Zap className="w-3 h-3" /> Race</>
                      : <><Shuffle className="w-3 h-3" /> Mystery Draw</>
                    }
                  </span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bright leading-tight">
                  {hunt.title}
                </h1>
              </div>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-1.5 text-sm text-dim">
              <span>Created by</span>
              <AddressDisplay
                address={hunt.creator}
                ensName={hunt.creatorEns}
                showCopy
                size="md"
              />
              <span>·</span>
              <span>{formatDate(hunt.createdAt)}</span>
            </div>
          </div>

          {/* Story / description */}
          {hunt.story && (
            <div className="card p-5 border-l-2 border-l-gold/40">
              <p className="font-serif italic text-body leading-relaxed text-sm">
                "{hunt.story}"
              </p>
            </div>
          )}

          {hunt.description && (
            <p className="text-body leading-relaxed">{hunt.description}</p>
          )}

          {/* Clues preview (locked) */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-bright">The Clues</h3>
              <span className="text-dim text-sm">{hunt.clues?.length ?? '?'} clues</span>
            </div>
            <div className="space-y-3">
              {hunt.clues?.slice(0, 2).map((clue, i) => (
                <div key={clue.id} className="flex items-start gap-3 p-3 bg-surface rounded-xl">
                  <span className="text-gold text-xs font-mono font-bold shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-dim text-sm italic line-clamp-2">"{clue.text}"</p>
                  <Lock className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                </div>
              ))}
              {(hunt.clues?.length ?? 0) > 2 && (
                <div className="flex items-center justify-center gap-2 py-3 text-muted text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  {(hunt.clues?.length ?? 0) - 2} more clues hidden — start the hunt to reveal them
                </div>
              )}
            </div>
          </div>

          {/* VRF draw status */}
          {hunt.huntType === HuntType.MysteryDraw && (
            <div className={cn(
              'card p-5',
              isClosed && 'border-gold/20 bg-gold/5',
              isSolved && 'border-success/20 bg-success/5',
            )}>
              <h3 className="font-semibold text-bright mb-3 flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-arcane-light" />
                Chainlink VRF Draw
              </h3>
              {isActive && (
                <div className="space-y-2 text-sm text-dim">
                  <p>Correct solvers: <span className="text-bright font-medium">{hunt.correctCount}</span></p>
                  <p>All correct solvers enter the draw. A verifiably random winner is selected by Chainlink VRF when the hunt closes.</p>
                </div>
              )}
              {isClosed && (
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gold">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    Randomness requested
                  </div>
                  <div className="flex items-center gap-2 text-dim">
                    <span className="w-2 h-2 rounded-full bg-muted" />
                    Awaiting Chainlink VRF callback...
                  </div>
                  <p className="text-muted text-xs mt-1">
                    This may take a few minutes. The result is determined by Chainlink's verifiable random function and cannot be tampered with.
                  </p>
                </div>
              )}
              {isSolved && hunt.winner && (
                <div>
                  <p className="text-dim text-sm mb-2">Winner selected via Chainlink VRF:</p>
                  <AddressDisplay
                    address={hunt.winner}
                    ensName={hunt.winnerEns}
                    showCopy
                    size="md"
                  />
                </div>
              )}
            </div>
          )}

          {/* Winner display */}
          {isSolved && hunt.winner && hasNFT && (
            <div className="card-glow p-5">
              <h3 className="font-semibold text-gold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Winner
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <AddressDisplay
                    address={hunt.winner}
                    ensName={hunt.winnerEns}
                    showCopy
                    size="lg"
                  />
                  <p className="text-dim text-xs mt-1">
                    Received {formatEth(hunt.prize)} ETH + Treasure NFT #{tokenId?.toString()}
                  </p>
                </div>
                {trophy && (
                  <div className="w-16 h-16 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-gold" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Solved badge for current user */}
          {hasSolved && (
            <div className="card p-4 border-success/20 bg-success/5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
              <div>
                <p className="text-success font-medium text-sm">You solved this hunt!</p>
                {hunt.huntType === HuntType.MysteryDraw && isActive && (
                  <p className="text-dim text-xs">You're in the draw. Good luck!</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Prize card */}
          <div className="card-glow p-6">
            <p className="text-dim text-xs uppercase tracking-wider mb-1">Prize</p>
            <p className="font-serif text-4xl font-bold text-gold mb-1">
              {formatEth(hunt.prize)} ETH
            </p>
            <p className="text-dim text-xs">+ Treasure NFT</p>

            {/* CTA */}
            <div className="mt-5">
              {canPlay && !hasSolved && (
                <TxButton
                  onClick={() => navigate(`/hunt/${hunt.id}/play`)}
                  className="w-full justify-center"
                  requireConnected={false}
                >
                  Enter Hunt
                  <ChevronRight className="w-4 h-4" />
                </TxButton>
              )}
              {hasSolved && (
                <div className="btn-secondary w-full justify-center opacity-60 cursor-default">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  Already Solved
                </div>
              )}
              {!canPlay && !isSolved && (
                <div className="text-center text-dim text-sm py-2">
                  {isClosed ? 'Draw in progress' : 'Hunt has ended'}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-bright text-sm">Stats</h3>

            {[
              { label: 'Participants',    value: hunt.participantCount.toLocaleString(), icon: Users },
              { label: 'Correct Solvers', value: hunt.correctCount.toLocaleString(),     icon: ShieldCheck },
              ...(hunt.endTime ? [{ label: 'Time Left', value: formatCountdown(hunt.endTime), icon: Clock }] : []),
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-dim text-sm">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <span className="text-bright text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Share */}
          <div className="card p-5">
            <h3 className="font-semibold text-bright text-sm mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Hunt
            </h3>
            <div className="flex gap-2">
              <input
                readOnly
                value={huntUrl}
                className="input-field text-xs py-2 flex-1"
              />
              <button
                onClick={handleCopy}
                className="btn-secondary px-3 py-2 text-xs shrink-0"
              >
                {copied ? <CheckCheck className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tech info */}
          <div className="card p-4 text-xs text-dim space-y-2">
            <p className="font-medium text-body mb-1">Answer Security</p>
            <p>Your final answer is cryptographically hashed before being sent on-chain. The plaintext is never stored or visible on the blockchain.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
