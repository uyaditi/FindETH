import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Trophy, Clock, Zap, Shuffle } from 'lucide-react'
import { cn, formatEth, formatCountdown } from '@/lib/utils'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, HUNT_TYPE_LABELS } from '@/lib/utils'
import { HuntStatus, HuntType, type Hunt } from '@/types'
import AddressDisplay from './AddressDisplay'

interface HuntCardProps {
  hunt:       Hunt
  index?:     number
  className?: string
}

const STATUS_BADGE: Record<HuntStatus, { label: string; cls: string }> = {
  [HuntStatus.Active]:    { label: 'Live',      cls: 'badge-green' },
  [HuntStatus.Closed]:    { label: 'Draw Soon', cls: 'badge-gold' },
  [HuntStatus.Solved]:    { label: 'Solved',    cls: 'badge-gray' },
  [HuntStatus.Cancelled]: { label: 'Cancelled', cls: 'badge-red' },
}

export default function HuntCard({ hunt, index = 0, className }: HuntCardProps) {
  const status = STATUS_BADGE[hunt.status] ?? STATUS_BADGE[HuntStatus.Active]
  const now    = Math.floor(Date.now() / 1000)
  const timeLeft = hunt.endTime && hunt.endTime > now
    ? formatCountdown(hunt.endTime)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn('h-full', className)}
    >
      <Link to={`/hunt/${hunt.id}`} className="block h-full">
        <div className="card-hover h-full flex flex-col p-5 gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Business badge */}
              {hunt.isBusiness && hunt.businessName && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  {hunt.businessLogo && (
                    <span className="text-sm">{hunt.businessLogo}</span>
                  )}
                  <span className="text-xs text-dim font-medium">{hunt.businessName}</span>
                  {hunt.isAiGenerated && (
                    <span className="badge badge-arcane text-[10px] px-1.5 py-0.5">AI</span>
                  )}
                </div>
              )}
              <h3 className="font-serif font-bold text-bright text-base leading-tight line-clamp-2">
                {hunt.title}
              </h3>
            </div>
            <span className={cn('badge shrink-0', status.cls)}>{status.label}</span>
          </div>

          {/* Description */}
          {hunt.description && (
            <p className="text-dim text-xs leading-relaxed line-clamp-2 flex-1">
              {hunt.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {/* Difficulty */}
            <span className={cn('font-medium', DIFFICULTY_COLORS[hunt.difficulty])}>
              {DIFFICULTY_LABELS[hunt.difficulty]}
            </span>

            {/* Hunt type */}
            <span className="flex items-center gap-1 text-dim">
              {hunt.huntType === HuntType.Race
                ? <Zap className="w-3 h-3 text-gold" />
                : <Shuffle className="w-3 h-3 text-arcane-light" />
              }
              {HUNT_TYPE_LABELS[hunt.huntType]}
            </span>

            {/* Time */}
            {timeLeft && (
              <span className="flex items-center gap-1 text-dim">
                <Clock className="w-3 h-3" />
                {timeLeft}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {/* Prize */}
            <div>
              <p className="text-xs text-dim mb-0.5">Prize</p>
              <p className="font-bold text-gold text-sm">
                {formatEth(hunt.prize)} ETH
              </p>
            </div>

            {/* Participants */}
            <div className="text-right">
              <p className="text-xs text-dim mb-0.5 flex items-center gap-1 justify-end">
                <Users className="w-3 h-3" />
                Players
              </p>
              <p className="font-semibold text-bright text-sm">{hunt.participantCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-1.5 text-xs text-dim">
            <span>by</span>
            <AddressDisplay
              address={hunt.creator}
              ensName={hunt.creatorEns}
              size="sm"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
