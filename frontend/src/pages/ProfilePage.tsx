import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Trophy, KeyRound, Zap, Users, Copy, CheckCheck, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import { useCreatorHunts } from '@/hooks/useSubgraph'
import { usePlayerTrophies, useNFTBalance } from '@/hooks/useNFT'
import { useENSName, useENSAvatar } from '@/hooks/useENS'
import HuntCard from '@/components/ui/HuntCard'
import { HuntCardSkeleton } from '@/components/ui/Skeleton'
import { cn, formatEth, shortAddress, copyToClipboard, formatDate } from '@/lib/utils'
import { HuntStatus } from '@/types'

function TrophyCard({ tokenId, huntId, huntTitle, prizeAmount, mintedAt }: {
  tokenId: bigint; huntId: bigint; huntTitle: string; prizeAmount: bigint; mintedAt: bigint
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-4 flex flex-col items-center gap-3 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
        <Trophy className="w-7 h-7 text-gold" />
      </div>
      <div>
        <p className="text-bright font-medium text-sm">{huntTitle || `Hunt #${huntId}`}</p>
        <p className="text-gold text-xs font-bold">{formatEth(prizeAmount)} ETH</p>
        <p className="text-muted text-[10px] mt-0.5">{formatDate(mintedAt)}</p>
      </div>
      <span className="badge badge-gold text-[10px]">Trophy #{tokenId.toString()}</span>
    </motion.div>
  )
}

export default function ProfilePage() {
  const { address: routeAddress } = useParams<{ address?: string }>()
  const { address: connectedAddress } = useAccount()
  const navigate = useNavigate()

  // Use route param address, or fall back to connected wallet
  const profileAddress = (routeAddress ?? connectedAddress ?? '') as `0x${string}`
  const isOwnProfile   = !routeAddress || routeAddress.toLowerCase() === connectedAddress?.toLowerCase()

  const { ensName, display } = useENSName(profileAddress)
  const { avatar }           = useENSAvatar(profileAddress)
  const { hunts, isLoading } = useCreatorHunts(profileAddress)
  const { trophies }         = usePlayerTrophies(profileAddress)
  const nftCount             = useNFTBalance(profileAddress)

  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    await copyToClipboard(profileAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!profileAddress) {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <p className="text-5xl mb-4">🗝️</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Connect your wallet</h2>
        <p className="text-dim mb-6">Connect to view your profile.</p>
      </div>
    )
  }

  const createdHunts = hunts
  const solvedHunts  = hunts.filter(h => h.status === HuntStatus.Solved)
  const totalWins    = trophies.length
  const totalEarned  = trophies.reduce((s, t) => s + (t.prizeAmount ?? 0n), 0n)

  return (
    <div className="container-page max-w-4xl py-12">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6"
      >
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center overflow-hidden shrink-0">
          {avatar
            ? <img src={avatar} alt={display} className="w-full h-full object-cover" />
            : <KeyRound className="w-9 h-9 text-gold" />
          }
        </div>

        {/* Identity */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className={cn('font-serif text-2xl font-bold mb-0.5', ensName ? 'text-gold' : 'text-bright')}>
            {display}
          </h1>
          {ensName && (
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <p className="text-dim text-sm font-mono">{shortAddress(profileAddress)}</p>
              <button onClick={handleCopyAddress} className="text-muted hover:text-bright">
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          {!ensName && (
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <p className="text-dim text-xs font-mono">{profileAddress}</p>
              <button onClick={handleCopyAddress} className="text-muted hover:text-bright">
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          {!ensName && (
            <p className="text-muted text-xs mt-1">
              No ENS name · <a href="https://app.ens.domains" target="_blank" rel="noopener noreferrer" className="text-arcane-light hover:underline inline-flex items-center gap-1">Get one <ExternalLink className="w-3 h-3" /></a>
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-6 sm:gap-8 shrink-0">
          {[
            { label: 'Hunts',   value: createdHunts.length, icon: Zap,    color: 'text-gold' },
            { label: 'Wins',    value: totalWins,            icon: Trophy, color: 'text-gold' },
            { label: 'NFTs',    value: nftCount,             icon: Trophy, color: 'text-arcane-light' },
            { label: 'Earned',  value: `${formatEth(totalEarned)} E`, icon: Users, color: 'text-success' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-muted text-xs">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trophies */}
      {trophies.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-bright mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Treasure Trophies ({trophies.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {trophies.map(t => (
              <TrophyCard
                key={t.tokenId.toString()}
                tokenId={t.tokenId}
                huntId={t.huntId}
                huntTitle={t.huntTitle}
                prizeAmount={t.prizeAmount}
                mintedAt={t.mintedAt}
              />
            ))}
          </div>
        </section>
      )}

      {/* Created hunts */}
      <section className="mb-10">
        <h2 className="font-semibold text-bright mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          Created Hunts ({createdHunts.length})
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[0, 1].map(i => <HuntCardSkeleton key={i} />)}
          </div>
        ) : createdHunts.length === 0 ? (
          <div className="card p-8 text-center border-dashed">
            <p className="text-dim text-sm mb-3">No hunts created yet.</p>
            {isOwnProfile && (
              <button onClick={() => navigate('/create')} className="btn-primary text-sm">
                Create a Hunt
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {createdHunts.slice(0, 6).map((hunt, i) => (
              <HuntCard key={hunt.id} hunt={hunt} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
