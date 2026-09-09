import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, Plus, BarChart3, Users, Trophy, Eye,
  TrendingUp, Share2, Copy, CheckCheck, Zap,
  MousePointerClick, Globe, UserCheck, Clock,
  ChevronRight, Building2, LogOut, ArrowUpRight,
  PieChart, Activity,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

// ── Static demo data ──────────────────────────────────────────────────────────

const OVERVIEW_STATS = [
  {
    label:   'Users Engaged',
    value:   '2,841',
    delta:   '+18% this week',
    icon:    Users,
    color:   'text-gold',
    bgColor: 'bg-gold/10 border-gold/20',
  },
  {
    label:   'Prize Claimed',
    value:   '1.24 ETH',
    delta:   '4 claims total',
    icon:    Trophy,
    color:   'text-arcane-light',
    bgColor: 'bg-arcane/10 border-arcane/20',
  },
  {
    label:   'Site Traffic',
    value:   '14,390',
    delta:   '+32% vs baseline',
    icon:    Globe,
    color:   'text-info',
    bgColor: 'bg-info/10 border-info/20',
  },
  {
    label:   'Clue Click-throughs',
    value:   '8,217',
    delta:   '57% conversion',
    icon:    MousePointerClick,
    color:   'text-success',
    bgColor: 'bg-success/10 border-success/20',
  },
  {
    label:   'Avg. Time on Site',
    value:   '6m 42s',
    delta:   '+4m vs normal',
    icon:    Clock,
    color:   'text-gold',
    bgColor: 'bg-gold/10 border-gold/20',
  },
  {
    label:   'Completion Rate',
    value:   '34%',
    delta:   'Industry avg: 18%',
    icon:    Activity,
    color:   'text-arcane-light',
    bgColor: 'bg-arcane/10 border-arcane/20',
  },
]

const AGE_GROUPS = [
  { label: '18–24', pct: 38, color: 'bg-gold' },
  { label: '25–34', pct: 31, color: 'bg-arcane-light' },
  { label: '35–44', pct: 17, color: 'bg-info' },
  { label: '45–54', pct:  9, color: 'bg-success' },
  { label: '55+',   pct:  5, color: 'bg-muted' },
]

const GENDER_SPLIT = [
  { label: 'Male',         pct: 54, color: 'bg-arcane-light' },
  { label: 'Female',       pct: 40, color: 'bg-gold' },
  { label: 'Non-binary',   pct:  4, color: 'bg-success' },
  { label: 'Undisclosed',  pct:  2, color: 'bg-muted' },
]

const TOP_CHANNELS = [
  { label: 'Direct / Link',    value: '6,210', pct: 43 },
  { label: 'Twitter / X',      value: '3,880', pct: 27 },
  { label: 'Discord',          value: '2,160', pct: 15 },
  { label: 'Instagram',        value: '1,290', pct:  9 },
  { label: 'Other',            value:   '850', pct:  6 },
]

const PAST_HUNTS = [
  {
    id:           'h-001',
    title:        'The Denim Trail',
    description:  'Follow clues hidden across our SS24 lookbook and product pages.',
    status:       'solved',
    players:      1240,
    solvers:      43,
    prize:        '0.5 ETH',
    winner:       '0x4a2b…c391',
    createdAt:    'Jul 12, 2026',
    endedAt:      'Jul 19, 2026',
    isAI:         true,
  },
  {
    id:           'h-002',
    title:        'Fabric Code: Summer Edition',
    description:  'Decode the patterns woven into our new linen collection.',
    status:       'active',
    players:      864,
    solvers:      11,
    prize:        '0.3 ETH',
    winner:       null,
    createdAt:    'Aug 28, 2026',
    endedAt:      null,
    isAI:         false,
  },
  {
    id:           'h-003',
    title:        'Archive Drop Hunt',
    description:  'Six clues referencing archive pieces from 2019–2021.',
    status:       'closed',
    players:      737,
    solvers:      29,
    prize:        '0.44 ETH',
    winner:       null,
    createdAt:    'Sep 1, 2026',
    endedAt:      'Sep 7, 2026',
    isAI:         true,
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, delta, icon: Icon, color, bgColor,
}: typeof OVERVIEW_STATS[number]) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-dim text-xs uppercase tracking-wider leading-none">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <div>
        <p className={cn('text-2xl font-bold leading-none mb-1', color)}>{value}</p>
        <p className="text-muted text-xs">{delta}</p>
      </div>
    </div>
  )
}

function BarRow({ label, pct, color, value }: { label: string; pct: number; color: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-dim text-xs w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
      <span className="text-bright text-xs font-medium w-8 text-right shrink-0">
        {value ?? `${pct}%`}
      </span>
    </div>
  )
}

type HuntStatus = 'active' | 'solved' | 'closed'

const STATUS_BADGE: Record<HuntStatus, string> = {
  active: 'badge-green',
  solved: 'badge-gold',
  closed: 'badge-gray',
}

const STATUS_LABEL: Record<HuntStatus, string> = {
  active: 'Live',
  solved: 'Solved',
  closed: 'Ended',
}

function HuntRow({ hunt, index }: { hunt: typeof PAST_HUNTS[number]; index: number }) {
  const navigate   = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/hunt/${hunt.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      {/* Left info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className={cn('badge text-[10px]', STATUS_BADGE[hunt.status as HuntStatus])}>
            {STATUS_LABEL[hunt.status as HuntStatus]}
          </span>
          {hunt.isAI && (
            <span className="badge badge-arcane text-[10px]">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
          <span className="text-muted text-xs">{hunt.createdAt}</span>
        </div>
        <p className="font-semibold text-bright text-sm truncate">{hunt.title}</p>
        <p className="text-dim text-xs mt-0.5 truncate">{hunt.description}</p>
        <div className="flex gap-3 mt-2">
          <span className="text-muted text-xs flex items-center gap-1">
            <Users className="w-3 h-3" /> {hunt.players.toLocaleString()} players
          </span>
          <span className="text-muted text-xs flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> {hunt.solvers} solved
          </span>
          <span className="text-muted text-xs flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {hunt.prize}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => navigate(`/hunt/${hunt.id}`)}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button
          onClick={() => navigate(`/hunt/${hunt.id}`)}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          <BarChart3 className="w-3.5 h-3.5" /> Stats
        </button>
        <button
          onClick={handleCopy}
          className="btn-ghost text-xs py-1.5 px-3"
          aria-label="Copy hunt link"
        >
          {copied
            ? <CheckCheck className="w-3.5 h-3.5 text-success" />
            : <Copy className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrandDashboardPage() {
  const navigate  = useNavigate()
  const { brandName, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activeCount = PAST_HUNTS.filter(h => h.status === 'active').length

  return (
    <div className="container-page py-10 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-arcane/10 border border-arcane/20 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-arcane-light" />
          </div>
          <div>
            <p className="text-dim text-xs mb-0.5">Brand Portal</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-bright leading-tight">
              {brandName ?? 'My Brand'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge badge-green text-[10px]">
                <Zap className="w-2.5 h-2.5" />
                {activeCount} active hunt{activeCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/create/ai')}
            className="btn-arcane text-sm py-2 px-4"
          >
            <Sparkles className="w-4 h-4" /> AI Hunt
          </button>
          <button
            onClick={() => navigate('/create/manual')}
            className="btn-primary text-sm py-2 px-4"
          >
            <Plus className="w-4 h-4" /> New Hunt
          </button>
          <button
            onClick={handleLogout}
            className="btn-ghost text-sm py-2 px-3 text-dim"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* ── Overview stats ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gold" />
          <h2 className="font-semibold text-bright text-sm uppercase tracking-wider">Campaign Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {OVERVIEW_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Demographics + Channels ────────────────────────────────────── */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Age groups */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-arcane-light" />
            <h3 className="font-semibold text-bright text-sm">Age Groups</h3>
          </div>
          <div className="flex flex-col gap-3.5">
            {AGE_GROUPS.map(({ label, pct, color }) => (
              <BarRow key={label} label={label} pct={pct} color={color} />
            ))}
          </div>
        </div>

        {/* Gender split */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-gold" />
            <h3 className="font-semibold text-bright text-sm">Gender Split</h3>
          </div>
          <div className="flex flex-col gap-3.5">
            {GENDER_SPLIT.map(({ label, pct, color }) => (
              <BarRow key={label} label={label} pct={pct} color={color} />
            ))}
          </div>
          {/* Visual donut placeholder */}
          <div className="mt-5 flex gap-2 flex-wrap">
            {GENDER_SPLIT.map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full', color)} />
                <span className="text-dim text-[11px]">{label} {pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic channels */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Share2 className="w-4 h-4 text-info" />
            <h3 className="font-semibold text-bright text-sm">Top Channels</h3>
          </div>
          <div className="flex flex-col gap-3.5">
            {TOP_CHANNELS.map(({ label, pct, value }) => (
              <BarRow key={label} label={label} pct={pct} color="bg-info" value={value} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Create Hunt CTAs ────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-arcane-light" />
          <h2 className="font-semibold text-bright text-sm uppercase tracking-wider">Start a New Hunt</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* AI Hunt */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/create/ai')}
            className="card-hover p-6 flex gap-4 cursor-pointer group border-arcane/10 hover:border-arcane/30"
          >
            <div className="w-11 h-11 rounded-xl bg-arcane/10 border border-arcane/20 flex items-center justify-center shrink-0 group-hover:bg-arcane/20 transition-colors">
              <Sparkles className="w-5 h-5 text-arcane-light" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-bright mb-1 flex items-center gap-2">
                Create with AI
                <span className="badge badge-arcane text-[10px]">Recommended</span>
              </h3>
              <p className="text-dim text-xs leading-relaxed">
                AI analyses your website, products, and brand story to generate a full treasure hunt with placement instructions for each clue.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-arcane-light transition-colors shrink-0 mt-0.5" />
          </motion.div>

          {/* Manual Hunt */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('/create/manual')}
            className="card-hover p-6 flex gap-4 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
              <Plus className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-bright mb-1">Build Manually</h3>
              <p className="text-dim text-xs leading-relaxed">
                Write your own clues, set prize amounts, choose between race or mystery-draw format, and publish directly to the blockchain.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted group-hover:text-gold transition-colors shrink-0 mt-0.5" />
          </motion.div>
        </div>
      </section>

      {/* ── Past Hunts ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gold" />
            <h2 className="font-semibold text-bright text-sm uppercase tracking-wider">Your Hunts</h2>
          </div>
          <p className="text-dim text-xs">{PAST_HUNTS.length} campaigns</p>
        </div>

        {PAST_HUNTS.length === 0 ? (
          <div className="card p-12 text-center border-dashed">
            <p className="text-4xl mb-3">🗝️</p>
            <h3 className="font-semibold text-bright mb-1">No hunts yet</h3>
            <p className="text-dim text-sm mb-5">
              Launch your first campaign and turn your audience into treasure hunters.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => navigate('/create/ai')} className="btn-arcane text-sm">
                <Sparkles className="w-4 h-4" /> Create with AI
              </button>
              <button onClick={() => navigate('/create/manual')} className="btn-secondary text-sm">
                Build manually
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {PAST_HUNTS.map((hunt, i) => (
              <HuntRow key={hunt.id} hunt={hunt} index={i} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
