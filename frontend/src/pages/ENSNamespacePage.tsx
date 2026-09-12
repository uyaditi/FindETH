/**
 * ENSNamespacePage
 *
 * Brand identity management via ENSv2 (Sepolia Beta).
 *
 * Sections:
 *   1. Brand Namespace — claim {slug}.treasurehunts.eth, see live records
 *   2. Hunt Subnames   — list registered hunt-{id}.{slug}... subnames
 *                        + register a subname for any existing on-chain hunt
 *   3. AI Agent Subnames — agent-{id}.{slug}... with WRITER_ROLE delegation
 *   4. Architecture explainer — shows the full namespace tree
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import {
  KeyRound, Globe, Sparkles, CheckCircle, AlertCircle,
  ExternalLink, Copy, ChevronDown, ChevronRight,
  ShieldCheck, Zap, RefreshCw, Bot, Building2,
  Link2, Lock, Unlock,
} from 'lucide-react'

import { useAuthStore } from '@/store/useAuthStore'
import {
  useRegisterBrandNamespace,
  useRegisterHuntSubname,
  useRegisterAgentSubname,
  useBrandSubnameRecords,
  useHuntSubnameRecords,
  useAgentSubnameRecords,
  useSubnameExists,
  useAgentWriterRole,
  useIsOnSepolia,
} from '@/hooks/useENSv2'
import { toBrandSlug, huntSubname, agentSubname, brandName as makeBrandName, PLATFORM_ENS_NAME, ENSV2_SEPOLIA, TEXT_KEYS } from '@/lib/ensv2'
import { cn, copyToClipboard } from '@/lib/utils'

// ─── Static demo hunts (same as brand dashboard) ─────────────────────────────
const DEMO_HUNTS = [
  { id: 'h-001', title: 'The Denim Trail',        status: 'Solved', prize: '0.5',  isAI: true  },
  { id: 'h-002', title: 'Fabric Code: Summer',    status: 'Active', prize: '0.3',  isAI: false },
  { id: 'h-003', title: 'Archive Drop Hunt',       status: 'Closed', prize: '0.44', isAI: true  },
]

const AGENT_ADDR_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD'

// ─── Small helpers ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-muted hover:text-bright transition-colors"
      aria-label="Copy"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function EnsLink({ name }: { name: string }) {
  return (
    <a
      href={`https://sepolia.app.ens.domains/${name}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-arcane-light hover:text-arcane text-xs flex items-center gap-1 transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      ENS Explorer
    </a>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle:       'badge-gray',
    confirming: 'badge-gold',
    pending:    'badge-gold',
    success:    'badge-green',
    error:      'badge-red',
  }
  const label: Record<string, string> = {
    idle: 'Ready', confirming: 'Waiting…', pending: 'Mining…',
    success: 'Confirmed', error: 'Failed',
  }
  return (
    <span className={cn('badge text-[10px]', map[status] ?? 'badge-gray')}>
      {label[status] ?? status}
    </span>
  )
}

// ─── Network guard banner ─────────────────────────────────────────────────────
function WrongNetworkBanner() {
  return (
    <div className="card border-warning/30 bg-warning/5 p-4 flex items-start gap-3 mb-6">
      <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <div>
        <p className="text-bright text-sm font-semibold">Switch to Sepolia</p>
        <p className="text-dim text-xs mt-0.5">
          ENSv2 is deployed on Ethereum Sepolia. Switch your wallet to Sepolia to
          register brand namespaces and hunt subnames.
        </p>
      </div>
    </div>
  )
}

// ─── Section 1: Brand Namespace ───────────────────────────────────────────────

function BrandNamespaceSection({ brandSlug }: { brandSlug: string }) {
  const fullName = makeBrandName(brandSlug)
  const { record, exists, records, isLoading, refetch } = useBrandSubnameRecords(brandSlug)
  const { register, registerStatus, recordsStatus, error, isPending } = useRegisterBrandNamespace()
  const { exists: labelTaken } = useSubnameExists(brandSlug)
  const { brandName: storedName, isAuthenticated } = useAuthStore()
  const { address } = useAccount()
  const isOnSepolia = useIsOnSepolia()

  const [open, setOpen] = useState(true)

  const handleRegister = async () => {
    if (!address || !storedName) return
    await register(storedName, {
      brandName: storedName,
      brandType: 'Fashion / Clothing',
      brandUrl:  '',
      brandAvatar: '',
    })
    refetch()
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-surface/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-arcane/10 border border-arcane/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-arcane-light" />
          </div>
          <div>
            <p className="text-bright font-semibold text-sm">Brand Namespace</p>
            <p className="font-mono text-xs text-arcane-light">{fullName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exists
            ? <span className="badge badge-green text-[10px]">● Registered</span>
            : <span className="badge badge-gray text-[10px]">○ Not registered</span>
          }
          {open
            ? <ChevronDown className="w-4 h-4 text-muted" />
            : <ChevronRight className="w-4 h-4 text-muted" />
          }
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Name info */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2 flex-1 min-w-0">
                  <KeyRound className="w-3.5 h-3.5 text-arcane-light shrink-0" />
                  <span className="font-mono text-xs text-bright truncate">{fullName}</span>
                  <CopyButton text={fullName} />
                </div>
                <EnsLink name={fullName} />
              </div>

              {/* Live records */}
              {exists && (
                <div className="rounded-xl bg-surface border border-border p-4">
                  <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3">
                    Live Resolver Records (PermissionedResolverImpl)
                  </p>
                  {isLoading ? (
                    <div className="text-muted text-xs">Loading…</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        [TEXT_KEYS.brandName, records[TEXT_KEYS.brandName]],
                        [TEXT_KEYS.brandType, records[TEXT_KEYS.brandType]],
                        [TEXT_KEYS.brandUrl,  records[TEXT_KEYS.brandUrl]],
                      ].map(([k, v]) => v ? (
                        <div key={k} className="flex gap-2">
                          <span className="text-muted text-[10px] shrink-0 w-24">{k}:</span>
                          <span className="text-dim text-[10px] truncate">{v}</span>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>
              )}

              {/* Resolver address */}
              <div className="flex items-center gap-2 text-xs">
                <Lock className="w-3 h-3 text-arcane-light" />
                <span className="text-muted">Resolver:</span>
                <span className="font-mono text-dim text-[10px]">{ENSV2_SEPOLIA.PermissionedResolverImpl}</span>
                <CopyButton text={ENSV2_SEPOLIA.PermissionedResolverImpl} />
              </div>

              {/* Register CTA */}
              {!exists && (
                <div className="flex flex-col gap-2">
                  {error && (
                    <p className="text-danger text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </p>
                  )}
                  {!isOnSepolia ? (
                    <p className="text-warning text-xs">Switch to Sepolia to register.</p>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={isPending || labelTaken}
                      className="btn-arcane text-sm py-2 disabled:opacity-50"
                    >
                      {isPending
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registering…</>
                        : <><Globe className="w-3.5 h-3.5" /> Claim {fullName}</>
                      }
                    </button>
                  )}
                  <div className="flex gap-2">
                    <StatusPill status={registerStatus} />
                    {recordsStatus !== 'idle' && (
                      <>
                        <span className="text-muted text-[10px]">→ Records</span>
                        <StatusPill status={recordsStatus} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section 2: Hunt Subname Row ──────────────────────────────────────────────

function HuntSubnameRow({
  hunt,
  brandSlug,
}: {
  hunt: typeof DEMO_HUNTS[number]
  brandSlug: string
}) {
  const fullName = huntSubname(hunt.id, brandSlug)
  const { record, exists, records, isLoading, refetch } = useHuntSubnameRecords(hunt.id, brandSlug)
  const { register, registerStatus, recordsStatus, recordsProgress, recordsTotal, error, isPending, registerTxHash } =
    useRegisterHuntSubname()
  const isOnSepolia = useIsOnSepolia()
  const { address } = useAccount()
  const [open, setOpen] = useState(false)

  const handleRegister = async () => {
    if (!address) return
    await register(hunt.id, brandSlug, {
      huntId:      hunt.id,
      title:       hunt.title,
      prize:       hunt.prize,
      status:      hunt.status,
      difficulty:  'medium',
      category:    'Fashion',
      creator:     address,
      createdAt:   new Date().toISOString(),
      isAiGenerated: hunt.isAI,
    })
    refetch()
  }

  return (
    <div className="card border-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/40 transition-colors"
      >
        {/* Status dot */}
        <span className={cn(
          'w-2 h-2 rounded-full shrink-0',
          exists ? 'bg-success' : 'bg-border'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-bright text-sm font-medium truncate">{hunt.title}</span>
            {hunt.isAI && <span className="badge badge-arcane text-[10px]"><Sparkles className="w-2.5 h-2.5" /> AI</span>}
            {exists && <span className="badge badge-green text-[10px]">ENS ✓</span>}
          </div>
          <p className="font-mono text-[10px] text-dim mt-0.5 truncate">{fullName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted text-xs">{hunt.prize} ETH</span>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-muted" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted" />
          }
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              {/* Full subname */}
              <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2">
                <Link2 className="w-3.5 h-3.5 text-arcane-light shrink-0" />
                <span className="font-mono text-xs text-bright flex-1 truncate">{fullName}</span>
                <CopyButton text={fullName} />
                <EnsLink name={fullName} />
              </div>

              {/* Live records */}
              {exists && !isLoading && (
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-2">
                    On-chain records (PermissionedResolver)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      [TEXT_KEYS.huntTitle,      records[TEXT_KEYS.huntTitle]],
                      [TEXT_KEYS.huntStatus,     records[TEXT_KEYS.huntStatus]],
                      [TEXT_KEYS.huntPrize,      records[TEXT_KEYS.huntPrize]],
                      [TEXT_KEYS.huntDifficulty, records[TEXT_KEYS.huntDifficulty]],
                      [TEXT_KEYS.huntCreator,    records[TEXT_KEYS.huntCreator]],
                      [TEXT_KEYS.huntIsAI,       records[TEXT_KEYS.huntIsAI]],
                    ].map(([k, v]) => v ? (
                      <div key={k} className="flex gap-1.5">
                        <span className="text-muted text-[10px] shrink-0">{k?.split('.')[1]}:</span>
                        <span className="text-dim text-[10px] truncate">{v}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Register CTA */}
              {!exists && (
                <div className="flex flex-col gap-2">
                  {error && (
                    <p className="text-danger text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </p>
                  )}
                  {!isOnSepolia ? (
                    <p className="text-warning text-xs">Switch to Sepolia to register.</p>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={isPending}
                      className="btn-secondary text-xs py-1.5 disabled:opacity-50"
                    >
                      {isPending
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Registering ({recordsProgress}/{recordsTotal})…</>
                        : <><KeyRound className="w-3 h-3" /> Register {huntSubname(hunt.id, brandSlug)}</>
                      }
                    </button>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <StatusPill status={registerStatus} />
                    {recordsStatus !== 'idle' && (
                      <>
                        <span className="text-muted text-[10px]">→ Records ({recordsProgress}/{recordsTotal})</span>
                        <StatusPill status={recordsStatus} />
                      </>
                    )}
                  </div>
                  {registerTxHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arcane-light text-[10px] flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> View tx on Etherscan
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section 3: AI Agent Subname ──────────────────────────────────────────────

function AgentSubnameRow({
  hunt,
  brandSlug,
}: {
  hunt: typeof DEMO_HUNTS[number]
  brandSlug: string
}) {
  const fullName = agentSubname(hunt.id, brandSlug)
  const { record, exists, records, isLoading } = useAgentSubnameRecords(hunt.id, brandSlug)
  const { register, status, error, isPending } = useRegisterAgentSubname()
  const { hasRole } = useAgentWriterRole(AGENT_ADDR_PLACEHOLDER as `0x${string}`)
  const isOnSepolia = useIsOnSepolia()
  const { address } = useAccount()
  const [open, setOpen] = useState(false)

  if (!hunt.isAI) return null   // only show agent row for AI-generated hunts

  const handleRegister = async () => {
    if (!address) return
    await register(
      hunt.id,
      brandSlug,
      AGENT_ADDR_PLACEHOLDER as `0x${string}`,
      {
        huntId:      hunt.id,
        version:     'v1.0',
        model:       'gemini-2.5-flash',
        createdAt:   new Date().toISOString(),
        permissions: 'setText,setAddr',
      },
    )
  }

  return (
    <div className="card border-arcane/10 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/40 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-arcane/10 border border-arcane/20 flex items-center justify-center shrink-0">
          <Bot className="w-3.5 h-3.5 text-arcane-light" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-bright text-sm font-medium">AI Agent — {hunt.title}</span>
            {exists && <span className="badge badge-arcane text-[10px]">ENS ✓</span>}
            {hasRole && <span className="badge badge-green text-[10px]"><ShieldCheck className="w-2.5 h-2.5" /> WRITER_ROLE</span>}
          </div>
          <p className="font-mono text-[10px] text-arcane-light mt-0.5 truncate">{fullName}</p>
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-arcane/10 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              {/* Subname */}
              <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2">
                <Bot className="w-3.5 h-3.5 text-arcane-light shrink-0" />
                <span className="font-mono text-xs text-bright flex-1 truncate">{fullName}</span>
                <CopyButton text={fullName} />
                <EnsLink name={fullName} />
              </div>

              {/* Permissions explanation */}
              <div className="rounded-xl bg-arcane/5 border border-arcane/20 p-3 text-xs">
                <p className="text-arcane-light font-medium mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ENSv2 PermissionedResolver — Delegated Access
                </p>
                <div className="space-y-1 text-dim">
                  <p>• Brand wallet holds <span className="text-bright font-mono text-[10px]">MANAGER_ROLE</span> — can write all records</p>
                  <p>• AI agent address holds <span className="text-bright font-mono text-[10px]">WRITER_ROLE</span> — can only <code className="bg-surface rounded px-1">setText</code></p>
                  <p>• Agent auto-updates <span className="text-bright font-mono text-[10px]">hunt.status</span> and <span className="text-bright font-mono text-[10px]">hunt.prize</span> as hunt progresses on-chain</p>
                </div>
              </div>

              {/* Live records */}
              {exists && !isLoading && (
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-muted text-[10px] uppercase tracking-wider mb-2">Agent Records</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(records).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-1.5">
                        <span className="text-muted text-[10px] shrink-0">{k.split('.')[1]}:</span>
                        <span className="text-dim text-[10px] truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Register CTA */}
              {!exists && (
                <div className="flex flex-col gap-2">
                  {error && <p className="text-danger text-xs">{error}</p>}
                  {!isOnSepolia ? (
                    <p className="text-warning text-xs">Switch to Sepolia to register.</p>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={isPending}
                      className="btn-arcane text-xs py-1.5 disabled:opacity-50"
                    >
                      {isPending
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Deploying agent…</>
                        : <><Bot className="w-3 h-3" /> Deploy AI Agent Subname + Grant WRITER_ROLE</>
                      }
                    </button>
                  )}
                  <StatusPill status={status} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Architecture diagram ─────────────────────────────────────────────────────

function NamespaceTree({ brandSlug }: { brandSlug: string }) {
  const exampleHunt = 'hunt-001'
  return (
    <div className="card p-5">
      <p className="text-dim text-xs font-medium uppercase tracking-wider mb-4">
        ENSv2 Namespace Structure
      </p>
      <div className="font-mono text-xs space-y-1">
        {[
          { indent: 0, name: PLATFORM_ENS_NAME,                       badge: 'Platform',   color: 'text-gold' },
          { indent: 1, name: `${brandSlug}.${PLATFORM_ENS_NAME}`,     badge: 'Brand',      color: 'text-arcane-light' },
          { indent: 2, name: `${exampleHunt}.${brandSlug}.${PLATFORM_ENS_NAME}`, badge: 'Hunt', color: 'text-success' },
          { indent: 2, name: `agent-001.${brandSlug}.${PLATFORM_ENS_NAME}`, badge: 'Agent', color: 'text-info' },
        ].map(({ indent, name, badge, color }) => (
          <div key={name} className="flex items-center gap-2" style={{ paddingLeft: `${indent * 16}px` }}>
            <span className="text-muted">{indent > 0 ? '└─ ' : ''}</span>
            <span className={cn('truncate', color)}>{name}</span>
            <span className={cn(
              'text-[9px] px-1 py-0.5 rounded font-sans shrink-0',
              badge === 'Platform' && 'bg-gold/10 text-gold',
              badge === 'Brand'    && 'bg-arcane/10 text-arcane-light',
              badge === 'Hunt'     && 'bg-success/10 text-success',
              badge === 'Agent'    && 'bg-info/10 text-info',
            )}>
              {badge}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2 text-[10px] text-muted">
        <div>
          <p className="text-dim font-medium mb-1">Resolver</p>
          <p className="font-mono text-[9px] break-all">{ENSV2_SEPOLIA.PermissionedResolverImpl}</p>
        </div>
        <div>
          <p className="text-dim font-medium mb-1">Registry</p>
          <p className="font-mono text-[9px] break-all">{ENSV2_SEPOLIA.ETHRegistry}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ENSNamespacePage() {
  const navigate   = useNavigate()
  const { address, isConnected } = useAccount()
  const { brandName, isAuthenticated, role } = useAuthStore()
  const isOnSepolia = useIsOnSepolia()

  const brandSlug = brandName ? toBrandSlug(brandName) : ''

  if (!isConnected) {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <p className="text-5xl mb-4">🔑</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Connect your wallet</h2>
        <p className="text-dim mb-6">Connect to Sepolia to manage your ENSv2 brand namespace.</p>
      </div>
    )
  }

  if (!isAuthenticated || role !== 'brand') {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <p className="text-5xl mb-4">🏷️</p>
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Brand portal required</h2>
        <p className="text-dim mb-6">Sign in as a brand to manage your ENSv2 namespace.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">Sign in as Brand</button>
      </div>
    )
  }

  return (
    <div className="container-page max-w-4xl py-10">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-arcane text-[10px]">ENSv2 · Sepolia Beta</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-bright mb-2">
          Brand Namespace
        </h1>
        <p className="text-dim max-w-2xl">
          Every brand gets a dedicated ENSv2 namespace on Sepolia.
          Hunt subnames store verified metadata on-chain via the PermissionedResolver.
          AI agents get their own subnames with delegated <code className="bg-surface rounded px-1 text-xs text-arcane-light">WRITER_ROLE</code> — they can update hunt status as players progress without needing full ownership.
        </p>
      </motion.div>

      {!isOnSepolia && <WrongNetworkBanner />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: interactive sections */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* 1. Brand namespace */}
          <section>
            <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-arcane-light" />
              1. Brand Namespace
            </p>
            <BrandNamespaceSection brandSlug={brandSlug} />
          </section>

          {/* 2. Hunt subnames */}
          <section>
            <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-gold" />
              2. Hunt Subnames
              <span className="badge badge-gray text-[10px]">{DEMO_HUNTS.length}</span>
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_HUNTS.map(hunt => (
                <HuntSubnameRow key={hunt.id} hunt={hunt} brandSlug={brandSlug} />
              ))}
            </div>
          </section>

          {/* 3. AI Agent subnames */}
          <section>
            <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-arcane-light" />
              3. AI Agent Subnames
              <span className="badge badge-arcane text-[10px]">WRITER_ROLE</span>
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_HUNTS.filter(h => h.isAI).map(hunt => (
                <AgentSubnameRow key={hunt.id} hunt={hunt} brandSlug={brandSlug} />
              ))}
            </div>
          </section>
        </div>

        {/* Right: architecture + contract info */}
        <div className="flex flex-col gap-4">
          <NamespaceTree brandSlug={brandSlug || 'mybrand'} />

          {/* Contract addresses reference */}
          <div className="card p-4">
            <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3">
              ENSv2 Sepolia Contracts
            </p>
            <div className="space-y-2">
              {[
                { label: 'ETHRegistry',        addr: ENSV2_SEPOLIA.ETHRegistry },
                { label: 'PermissionedResolver', addr: ENSV2_SEPOLIA.PermissionedResolverImpl },
                { label: 'PublicResolverV2',   addr: ENSV2_SEPOLIA.PublicResolverV2 },
                { label: 'UniversalResolver',  addr: ENSV2_SEPOLIA.UniversalResolver },
              ].map(({ label, addr }) => (
                <div key={label}>
                  <p className="text-muted text-[10px] mb-0.5">{label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] text-dim truncate">{addr}</span>
                    <CopyButton text={addr} />
                    <a
                      href={`https://sepolia.etherscan.io/address/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-arcane-light transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ENS Explorer link */}
          <a
            href="https://sepolia.app.ens.domains"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm justify-center"
          >
            <Globe className="w-4 h-4" />
            Open ENS App (Sepolia)
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
