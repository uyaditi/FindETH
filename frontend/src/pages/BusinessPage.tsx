import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  Sparkles, BarChart3, Users, Trophy, CheckCircle,
  TrendingUp, Zap, Plus, Eye, Share2, Crown,
} from 'lucide-react'
import { useCreatorHunts, useHuntAnalytics } from '@/hooks/useSubgraph'
import { useCurrentUserENS } from '@/hooks/useENS'
import { HuntStatus, type Hunt } from '@/types'
import { cn, formatEth } from '@/lib/utils'
import { PLANS } from '@/lib/constants'

// ── Analytics panel for a single hunt ────────────────────────────────────────

function HuntAnalyticsCard({ hunt }: { hunt: Hunt }) {
  const { analytics } = useHuntAnalytics(hunt.id)
  const navigate      = useNavigate()

  const completion = analytics?.completionRate ?? (
    hunt.participantCount > 0
      ? Math.round((hunt.correctCount / hunt.participantCount) * 100)
      : 0
  )

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          {hunt.isAiGenerated && (
            <span className="badge badge-arcane text-[10px] mb-1">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
          <h3 className="font-semibold text-bright text-sm">{hunt.title}</h3>
          <span className={cn(
            'badge text-[10px] mt-1',
            hunt.status === HuntStatus.Active ? 'badge-green' : 'badge-gray',
          )}>
            {hunt.status === HuntStatus.Active ? 'Live' : 'Ended'}
          </span>
        </div>
        <p className="text-gold font-bold text-sm">{formatEth(hunt.prize)} ETH</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Players',    value: hunt.participantCount },
          { label: 'Correct',   value: hunt.correctCount },
          { label: 'Rate',      value: `${completion}%` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-bright font-bold text-lg">{value}</p>
            <p className="text-muted text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>Completion Rate</span>
          <span>{completion}%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => navigate(`/hunt/${hunt.id}`)} className="btn-ghost text-xs py-1.5 flex-1 justify-center">
          <Eye className="w-3 h-3" /> View
        </button>
        <button className="btn-ghost text-xs py-1.5 flex-1 justify-center">
          <BarChart3 className="w-3 h-3" /> Analytics
        </button>
        <button className="btn-ghost text-xs py-1.5 flex-1 justify-center">
          <Share2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, current }: { plan: typeof PLANS['free']; current?: boolean }) {
  return (
    <div className={cn(
      'card p-5 flex flex-col',
      current && 'border-gold/40 bg-gold/5',
      plan.id === 'ai' && 'border-arcane/40 bg-arcane/5',
    )}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-bright">{plan.name}</h3>
        {current && <span className="badge badge-gold text-[10px]">Current</span>}
        {plan.id === 'ai' && !current && <span className="badge badge-arcane text-[10px]">Popular</span>}
      </div>
      <p className="text-dim text-xs mb-4">{plan.description}</p>
      <ul className="space-y-1.5 text-xs text-dim flex-1 mb-4">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-success shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button className={cn(
        'w-full text-sm py-2',
        plan.id === 'enterprise' ? 'btn-secondary' :
        plan.id === 'ai' ? 'btn-arcane' : 'btn-secondary',
      )}>
        {plan.id === 'enterprise' ? 'Contact Sales' : current ? 'Current Plan' : 'Upgrade'}
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { display }              = useCurrentUserENS()
  const { hunts }                = useCreatorHunts(address)

  const businessHunts = hunts.filter(h => h.isBusiness)
  const totalPlayers  = businessHunts.reduce((s, h) => s + (h.participantCount ?? 0), 0)
  const totalSolvers  = businessHunts.reduce((s, h) => s + (h.correctCount ?? 0), 0)
  const activeHunts   = businessHunts.filter(h => h.status === HuntStatus.Active).length

  if (!isConnected) {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <p className="text-5xl mb-4">🏢</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Business Dashboard</h2>
        <p className="text-dim mb-6">Connect your wallet to access the business platform.</p>
      </div>
    )
  }

  return (
    <div className="container-page py-12 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
      >
        <div>
          <p className="text-dim text-sm mb-1">Business Dashboard</p>
          <h1 className="font-serif text-3xl font-bold text-bright">{display}</h1>
          <p className="text-dim text-xs mt-1">Turn your content into interactive campaigns</p>
        </div>
        <button onClick={() => navigate('/create/ai')} className="btn-arcane text-sm">
          <Sparkles className="w-4 h-4" /> Create AI Hunt
        </button>
      </motion.div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Active Campaigns', value: activeHunts,  icon: Zap,        color: 'text-gold' },
          { label: 'Total Players',    value: totalPlayers, icon: Users,       color: 'text-arcane-light' },
          { label: 'Total Solvers',    value: totalSolvers, icon: CheckCircle, color: 'text-success' },
          { label: 'Completion Rate',  value: totalPlayers > 0
            ? `${Math.round((totalSolvers / totalPlayers) * 100)}%` : '—',
            icon: TrendingUp, color: 'text-info' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-muted text-xs">{label}</p>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-bright">Active Campaigns</h2>
          <button onClick={() => navigate('/create/ai')} className="btn-ghost text-xs">
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
        </div>

        {businessHunts.length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <Sparkles className="w-10 h-10 text-arcane-light mx-auto mb-3" />
            <h3 className="font-semibold text-bright mb-2">No campaigns yet</h3>
            <p className="text-dim text-sm mb-5 max-w-sm mx-auto">
              Let AI turn your business content into an interactive treasure hunt campaign.
            </p>
            <button onClick={() => navigate('/create/ai')} className="btn-arcane">
              <Sparkles className="w-4 h-4" /> Create with AI
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {businessHunts.map((hunt, i) => (
              <motion.div
                key={hunt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <HuntAnalyticsCard hunt={hunt} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing plans */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Crown className="w-5 h-5 text-gold" />
          <h2 className="font-semibold text-bright">Plans</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PLANS).map(plan => (
            <PlanCard key={plan.id} plan={plan} current={plan.id === 'free'} />
          ))}
        </div>
        <p className="text-muted text-xs text-center mt-4">
          Platform pricing is separate from hunt prize funds. Your ETH prize goes directly to winners.
        </p>
      </div>
    </div>
  )
}
