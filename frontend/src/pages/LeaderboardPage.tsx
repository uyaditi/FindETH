import { motion } from 'framer-motion'
import { Trophy, Medal, Zap, Crown, ExternalLink } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useSubgraph'
import { useBatchENS } from '@/hooks/useENS'
import { LeaderboardRowSkeleton } from '@/components/ui/Skeleton'
import { formatEth, shortAddress } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'

const RANK_ICONS = [
  <Crown key={1} className="w-5 h-5 text-gold" />,
  <Medal key={2} className="w-5 h-5 text-[#C0C0C0]" />,
  <Medal key={3} className="w-5 h-5 text-[#CD7F32]" />,
]

function RankDisplay({ rank }: { rank: number }) {
  if (rank <= 3) return <div className="w-8 flex items-center justify-center">{RANK_ICONS[rank - 1]}</div>
  return (
    <div className="w-8 flex items-center justify-center">
      <span className="text-muted text-sm font-mono font-bold">{rank}</span>
    </div>
  )
}

function LeaderboardRow({
  entry, ensNames, index,
}: {
  entry: LeaderboardEntry
  ensNames: Record<string, string | null>
  index: number
}) {
  const ens     = entry.ensName ?? ensNames[entry.address]
  const display = ens ?? shortAddress(entry.address)
  const isTop3  = entry.rank <= 3

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-surface',
        isTop3 && 'bg-gold/5 border border-gold/15',
      )}
    >
      <RankDisplay rank={entry.rank} />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium truncate text-sm',
          ens ? 'text-gold' : 'text-bright font-mono',
        )}>
          {display}
        </p>
        {ens && (
          <p className="text-muted text-xs font-mono truncate">{shortAddress(entry.address)}</p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
        <div>
          <p className="text-bright font-bold text-sm">{entry.wins}</p>
          <p className="text-muted text-[10px]">Wins</p>
        </div>
        <div>
          <p className="text-bright text-sm">{entry.huntsSolved}</p>
          <p className="text-muted text-[10px]">Solved</p>
        </div>
        <div>
          <p className="text-gold font-bold text-sm">{formatEth(entry.totalEarned)} ETH</p>
          <p className="text-muted text-[10px]">Earned</p>
        </div>
        <div>
          <p className="text-arcane-light text-sm">{entry.nftsOwned}</p>
          <p className="text-muted text-[10px]">NFTs</p>
        </div>
      </div>

      {/* Mobile condensed */}
      <div className="sm:hidden text-right shrink-0">
        <p className="text-gold font-bold text-sm">{entry.wins} wins</p>
        <p className="text-muted text-xs">{formatEth(entry.totalEarned)} ETH</p>
      </div>
    </motion.div>
  )
}

export default function LeaderboardPage() {
  const { entries, isLoading } = useLeaderboard(50)
  const addresses  = entries.map(e => e.address)
  const { names }  = useBatchENS(addresses)

  return (
    <div className="container-page max-w-3xl py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-7 h-7 text-gold" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-bright mb-2">Leaderboard</h1>
        <p className="text-dim">The greatest hunters on the internet.</p>
      </motion.div>

      {/* Top 3 cards */}
      {!isLoading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {entries.slice(0, 3).map((entry, i) => {
            const ens     = entry.ensName ?? names[entry.address]
            const display = ens ?? shortAddress(entry.address)
            return (
              <motion.div
                key={entry.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'card p-4 text-center',
                  i === 0 && 'border-gold/40 bg-gold/5 order-2',
                  i === 1 && 'order-1',
                  i === 2 && 'order-3',
                )}
              >
                <div className="mb-2 flex justify-center">
                  {RANK_ICONS[i]}
                </div>
                <p className={cn('text-xs font-medium truncate', ens ? 'text-gold' : 'text-bright font-mono')}>
                  {display}
                </p>
                <p className="text-gold font-bold mt-1">{entry.wins}</p>
                <p className="text-muted text-[10px]">wins</p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-surface">
          <div className="w-8" />
          <p className="flex-1 text-xs text-muted uppercase tracking-wider">Hunter</p>
          <div className="hidden sm:flex items-center gap-6 text-right text-xs text-muted uppercase tracking-wider">
            <span className="w-8">Wins</span>
            <span className="w-12">Solved</span>
            <span className="w-20">Earned</span>
            <span className="w-8">NFTs</span>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50 px-2 py-2">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
            : entries.length === 0
            ? (
              <div className="text-center py-12">
                <p className="text-dim text-sm">No hunters yet. Be the first!</p>
              </div>
            )
            : entries.map((entry, i) => (
              <LeaderboardRow
                key={entry.address}
                entry={entry}
                ensNames={names}
                index={i}
              />
            ))
          }
        </div>
      </div>

      <p className="text-center text-muted text-xs mt-6">
        Data indexed by The Graph · Updated every block
      </p>
    </div>
  )
}
