import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TxStatus } from '@/types'

interface TxStatusBannerProps {
  status:    TxStatus
  chainId?:  number
  className?: string
}

const EXPLORERS: Record<number, string> = {
  1:     'https://etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  31337: '',  // Anvil — no explorer
}

export default function TxStatusBanner({ status, chainId, className }: TxStatusBannerProps) {
  if (status.state === 'idle') return null

  const explorerBase = chainId ? EXPLORERS[chainId] : ''
  const txUrl = status.hash && explorerBase
    ? `${explorerBase}/tx/${status.hash}`
    : undefined

  return (
    <AnimatePresence>
      <motion.div
        key={status.state}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border text-sm',
          className,
          status.state === 'confirming' && 'bg-gold/5 border-gold/20 text-gold',
          status.state === 'pending'    && 'bg-info/5 border-info/20 text-info',
          status.state === 'success'    && 'bg-success/5 border-success/20 text-success',
          status.state === 'error'      && 'bg-danger/5 border-danger/20 text-danger',
        )}
      >
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {status.state === 'confirming' && <Clock className="w-4 h-4" />}
          {status.state === 'pending'    && <Loader2 className="w-4 h-4 animate-spin" />}
          {status.state === 'success'    && <CheckCircle className="w-4 h-4" />}
          {status.state === 'error'      && <XCircle className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {status.state === 'confirming' && 'Waiting for wallet confirmation...'}
            {status.state === 'pending'    && 'Transaction submitted. Waiting for blockchain confirmation...'}
            {status.state === 'success'    && (status.message ?? 'Transaction confirmed.')}
            {status.state === 'error'      && (status.error ?? 'Transaction failed.')}
          </p>

          {txUrl && (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs opacity-70 hover:opacity-100 underline"
            >
              View on Etherscan
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {status.state === 'error' && status.error && (
            <p className="mt-1 text-xs opacity-70">{status.error}</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
