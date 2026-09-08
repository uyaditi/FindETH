import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal, Zap, Shuffle, X } from 'lucide-react'
import { useHunts } from '@/hooks/useHunt'
import HuntCard from '@/components/ui/HuntCard'
import { HuntCardSkeleton } from '@/components/ui/Skeleton'
import { HuntStatus, HuntType, Difficulty, type Hunt } from '@/types'
import { cn } from '@/lib/utils'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/utils'

type SortKey = 'newest' | 'prize' | 'players' | 'ending'

const STATUS_FILTERS = [
  { value: undefined,         label: 'All'      },
  { value: HuntStatus.Active, label: 'Live'     },
  { value: HuntStatus.Solved, label: 'Solved'   },
]

const TYPE_FILTERS = [
  { value: undefined,              label: 'All Types'     },
  { value: HuntType.Race,          label: '🏁 Race'       },
  { value: HuntType.MysteryDraw,   label: '🎲 Mystery Draw' },
]

const DIFFICULTY_FILTERS = [
  { value: undefined,         label: 'Any Difficulty' },
  { value: Difficulty.Easy,   label: 'Easy'   },
  { value: Difficulty.Medium, label: 'Medium' },
  { value: Difficulty.Hard,   label: 'Hard'   },
  { value: Difficulty.Expert, label: 'Expert' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',  label: 'Newest'      },
  { value: 'prize',   label: 'Highest Prize' },
  { value: 'players', label: 'Most Players' },
  { value: 'ending',  label: 'Ending Soon'  },
]

export default function ExplorePage() {
  const { hunts, isLoading } = useHunts()

  // Filters
  const [query,      setQuery]      = useState('')
  const [status,     setStatus]     = useState<HuntStatus | undefined>()
  const [huntType,   setHuntType]   = useState<HuntType | undefined>()
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>()
  const [sortKey,    setSortKey]    = useState<SortKey>('newest')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo<Hunt[]>(() => {
    let result = [...hunts]

    if (query) {
      const q = query.toLowerCase()
      result = result.filter(h =>
        h.title.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.creatorEns?.toLowerCase().includes(q)
      )
    }

    if (status !== undefined)     result = result.filter(h => h.status === status)
    if (huntType !== undefined)   result = result.filter(h => h.huntType === huntType)
    if (difficulty !== undefined) result = result.filter(h => h.difficulty === difficulty)

    result.sort((a, b) => {
      switch (sortKey) {
        case 'prize':   return Number(b.prize - a.prize)
        case 'players': return (b.participantCount ?? 0) - (a.participantCount ?? 0)
        case 'ending':  return (a.endTime ?? Infinity) - (b.endTime ?? Infinity)
        default:        return (b.createdAt ?? 0) - (a.createdAt ?? 0)
      }
    })

    return result
  }, [hunts, query, status, huntType, difficulty, sortKey])

  const hasFilters = !!query || status !== undefined || huntType !== undefined || difficulty !== undefined

  const clearFilters = () => {
    setQuery('')
    setStatus(undefined)
    setHuntType(undefined)
    setDifficulty(undefined)
  }

  return (
    <div className="container-page py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-serif text-4xl font-bold text-bright mb-2">Explore Hunts</h1>
        <p className="text-dim">
          {isLoading ? 'Loading...' : `${hunts.length} hunt${hunts.length !== 1 ? 's' : ''} available`}
        </p>
      </motion.div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search hunts, creators..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field pl-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-bright"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={String(sortKey)}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="input-field text-sm py-2 min-w-[140px]"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary flex items-center gap-2 py-2 px-3 text-sm',
              (hasFilters || showFilters) && 'border-gold/40 text-gold'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            )}
          </button>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-sm text-dim">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {/* Status */}
          <div>
            <label className="input-label">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(f => (
                <button
                  key={String(f.value)}
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    'badge cursor-pointer transition-all',
                    status === f.value ? 'badge-gold' : 'badge-gray hover:border-gold/30'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="input-label">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map(f => (
                <button
                  key={String(f.value)}
                  onClick={() => setHuntType(f.value)}
                  className={cn(
                    'badge cursor-pointer transition-all',
                    huntType === f.value ? 'badge-arcane' : 'badge-gray hover:border-arcane/30'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="input-label">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_FILTERS.map(f => (
                <button
                  key={String(f.value)}
                  onClick={() => setDifficulty(f.value)}
                  className={cn(
                    'badge cursor-pointer transition-all text-xs',
                    difficulty === f.value
                      ? 'border-gold/60 bg-gold/10 text-gold'
                      : 'badge-gray hover:border-gold/20',
                    f.value && DIFFICULTY_COLORS[f.value]
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Hunt type quick-filter pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-1">
        {[
          { label: 'All',          icon: null,     onClick: () => setHuntType(undefined),           active: huntType === undefined },
          { label: '🏁 Race',      icon: Zap,      onClick: () => setHuntType(HuntType.Race),        active: huntType === HuntType.Race },
          { label: '🎲 Mystery',   icon: Shuffle,  onClick: () => setHuntType(HuntType.MysteryDraw), active: huntType === HuntType.MysteryDraw },
        ].map(pill => (
          <button
            key={pill.label}
            onClick={pill.onClick}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border',
              pill.active
                ? 'bg-gold/10 border-gold/40 text-gold'
                : 'bg-surface border-border text-dim hover:border-gold/20 hover:text-bright'
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <HuntCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🗝️</p>
          <h3 className="font-serif text-xl font-bold text-bright mb-2">No hunts found</h3>
          <p className="text-dim text-sm">
            {hasFilters ? 'Try adjusting your filters.' : 'No hunts available yet.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((hunt, i) => (
            <HuntCard key={hunt.id} hunt={hunt} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
