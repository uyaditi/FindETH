import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TxState } from '@/types'

interface TxButtonProps {
  onClick:     () => void | Promise<void>
  txState?:    TxState
  isPending?:  boolean
  disabled?:   boolean
  children:    React.ReactNode
  className?:  string
  variant?:    'primary' | 'arcane' | 'danger'
  requireConnected?: boolean
}

const STATE_LABELS: Partial<Record<TxState, string>> = {
  confirming: 'Waiting for wallet...',
  pending:    'Confirming...',
}

export default function TxButton({
  onClick,
  txState = 'idle',
  isPending = false,
  disabled = false,
  children,
  className,
  variant = 'primary',
  requireConnected = true,
}: TxButtonProps) {
  const { isConnected } = useAccount()

  // Show RainbowKit connect if wallet not connected
  if (requireConnected && !isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            onClick={openConnectModal}
            className={cn(
              variant === 'primary' ? 'btn-primary' : variant === 'arcane' ? 'btn-arcane' : 'btn-danger',
              className
            )}
          >
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    )
  }

  const isActive = isPending || txState === 'confirming' || txState === 'pending'
  const label    = STATE_LABELS[txState]

  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      className={cn(
        variant === 'primary' ? 'btn-primary' :
        variant === 'arcane'  ? 'btn-arcane'  : 'btn-danger',
        isActive && 'opacity-75 cursor-not-allowed',
        className
      )}
    >
      {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
      {label ?? children}
    </button>
  )
}
