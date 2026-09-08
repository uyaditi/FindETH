import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  Plus, BarChart3, Trophy, Users, Zap, Eye,
  Share2, CheckCircle, Clock, Sparkles,
} from 'lucide-react'
import { useCreatorHunts } from '@/hooks/useSubgraph'
import { useCurrentUserENS } from '@/hooks/useENS'
import { useNFTBalance } from '@/hooks/useNFT'
import AddressDisplay from '@/components/ui/AddressDisplay'
import { HuntStatus, HuntType, type Hunt } from '@/types'
import { cn, formatEth } from '@/lib/utils'

function StatCard({ label, value, sub, icon: Icon, color = 'text-gold' }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-dim text-xs uppercase tracking-wider">{label}</p>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className={cn('text-2xl font-bold mb-0.5', color)}>{value}</p>
      {sub && <p className="text-muted text-xs">{sub}</p>}
    </div>
  )
}

function HuntRow({ hunt }: { hunt: Hunt }) {
  const navigate = useNavigate()
  const statusColors: Record<HuntStatus, string> = {
    [HuntStatus.Active]:    'badge-green',
    [HuntStatus.Closed]:    'badge-gold',
    [HuntStatus.Solved]:    'badge-gray',
    [HuntStatus.Cancelled]: 'badge-red',
  }
  const statusLabels: Record<HuntStatus, string> = {
    [HuntStatus.Active]:    'Live',
    [HuntStatus.Closed]:    'Draw Pending',
    [HuntStatus.Solved]:    'Solved',
    [HuntStatus.Cancelled]: 'Cancelled',
  }

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('badge text-[10px]', statusColors[hunt.status])}>
            {statusLabels[hunt.status]}
          </span>
          {hunt.isAiGenerated && (
            <span className="badge badge-arcane text-[10px]">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>
        <p className="font-semibold text-bright text-sm truncate">{hunt.title}</p>
        <p className="text-dim text-xs mt-0.5">
          {hunt.participantCount} players · {hunt.correctCount} solved · {formatEth(hunt.prize)} ETH
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(`/hunt/${hunt.id}`)}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button className="btn-ghost text-xs py-1.5 px-3">
          <BarChart3 className="w-3.5 h-3.5" /> Analytics
        </button>
        <button className="btn-ghost text-xs py-1.5 px-3">
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { ensName, display }     = useCurrentUserENS()
  const { hunts, isLoading }     = useCreatorHunts(address)
  const nftCount                 = useNFTBalance(address)

  if (!isConnected) {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <p className="text-5xl mb-4">🗝️</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Connect your wallet</h2>
        <p className="text-dim mb-6">Connect to view your creator dashboard.</p>
      </div>
    )
  }

  // Aggregate stats from hunts
  const activeHunts   = hunts.filter(h => h.status === HuntStatus.Active).length
  const totalPlayers  = hunts.reduce((s, h) => s + (h.participantCount ?? 0), 0)
  const totalSolvers  = hunts.reduce((s, h) => s + (h.correctCount ?? 0), 0)
  const totalPrize    = hunts.reduce((s, h) => s + (h.prize ?? 0n), 0n)
  const completionRate = totalPlayers > 0
    ? Math.round((totalSolvers / totalPlayers) * 100)
    : 0

  return (
    <div className="container-page py-12 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
      >
        <div>
          <p className="text-dim text-sm mb-1">Creator Dashboard</p>
          <h1 className="font-serif text-3xl font-bold text-bright">
            {display}
          </h1>
          {address && (
            <AddressDisplay address={address} ensName={ensName ?? undefined} showCopy size="sm" />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/create/ai')} className="btn-arcane text-sm py-2">
            <Sparkles className="w-4 h-4" /> AI Hunt
          </button>
          <button onClick={() => navigate('/create/manual')} className="btn-primary text-sm py-2">
            <Plus className="w-4 h-4" /> New Hunt
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <StatCard label="Active Hunts"    value={activeHunts}     icon={Zap}       color="text-gold" />
        <StatCard label="Total Players"   value={totalPlayers}    icon={Users}     color="text-arcane-light" />
        <StatCard label="Total Solvers"   value={totalSolvers}    icon={CheckCircle} color="text-success" />
        <StatCard label="Completion"      value={`${completionRate}%`} icon={BarChart3}  color="text-info" />
        <StatCard label="ETH Distributed" value={`${formatEth(totalPrize)} ETH`} icon={Trophy} color="text-gold" />
        <StatCard label="NFTs Minted"     value={nftCount}        icon={Trophy}    color="text-arcane-light" />
      </div>

      {/* Hunt list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-bright">Your Hunts</h2>
          <p className="text-dim text-sm">{hunts.length} total</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : hunts.length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <p className="text-4xl mb-3">🗝️</p>
            <h3 className="font-semibold text-bright mb-1">No hunts yet</h3>
            <p className="text-dim text-sm mb-4">Create your first hunt to start engaging players.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => navigate('/create/ai')} className="btn-arcane text-sm">
                <Sparkles className="w-4 h-4" /> Create with AI
              </button>
              <button onClick={() => navigate('/create/manual')} className="btn-secondary text-sm">
                Create manually
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hunts.map((hunt, i) => (
              <motion.div
                key={hunt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <HuntRow hunt={hunt} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
