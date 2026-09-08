import { useState } from 'react'
import { Copy, CheckCheck } from 'lucide-react'
import { useENSName } from '@/hooks/useENS'
import { copyToClipboard, shortAddress } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AddressDisplayProps {
  address:    string
  ensName?:   string   // pass if already resolved
  showAvatar?: boolean
  showCopy?:  boolean
  className?: string
  size?:      'sm' | 'md' | 'lg'
}

export default function AddressDisplay({
  address,
  ensName: preResolvedEns,
  showCopy  = false,
  className,
  size = 'md',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)
  // Only resolve if not pre-resolved
  const { ensName: resolvedEns } = useENSName(preResolvedEns ? undefined : address)
  const ens = preResolvedEns ?? resolvedEns

  const display = ens ?? shortAddress(address)

  const handleCopy = async () => {
    await copyToClipboard(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {/* ENS badge or address */}
      <span className={cn(
        'font-mono',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        ens ? 'text-gold font-medium' : 'text-dim',
      )}>
        {display}
      </span>

      {/* Copy button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-muted hover:text-bright transition-colors"
          aria-label="Copy address"
        >
          {copied
            ? <CheckCheck className="w-3 h-3 text-success" />
            : <Copy className="w-3 h-3" />
          }
        </button>
      )}
    </span>
  )
}
