import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useSignMessage } from 'wagmi'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  Sparkles, ChevronRight, CheckCircle, RefreshCw, Edit3, Trash2,
  MapPin, Info, AlertCircle, Loader2, RotateCcw, Eye, EyeOff,
  Database, TrendingUp, BarChart3, ExternalLink, ShieldCheck,
} from 'lucide-react'

import { generateHunt, regenerateClue, PIPELINE_STEPS, type PipelineStep, type GraphRecommendations } from '@/services/ai'
import { useCreateHunt } from '@/hooks/useHuntActions'
import TxButton from '@/components/ui/TxButton'
import TxStatusBanner from '@/components/ui/TxStatusBanner'
import { saveHuntMetadata, metadataPublishMessage } from '@/lib/huntMetadata'
import { cn, copyToClipboard } from '@/lib/utils'
import { hashAnswer, spoilerSafe } from '@/lib/answerHash'
import {
  DIFFICULTIES, HUNT_TYPES, BUSINESS_TYPES, CONTENT_CHANNELS, SUBGRAPH_URL,
} from '@/lib/constants'
import {
  Difficulty, HuntType,
  type AIHuntGenerationInput, type AIGeneratedHunt, type AIGeneratedClue,
} from '@/types'

// ─── Input form ───────────────────────────────────────────────────────────────

function InputForm({ onGenerate }: { onGenerate: (input: AIHuntGenerationInput) => void }) {
  const { register, handleSubmit, watch } = useForm<AIHuntGenerationInput>({
    defaultValues: {
      businessUrl:    '',
      businessDescription: '',
      businessName:   '',
      businessType:   'Fashion / Clothing',
      campaign:       '',
      targetAudience: '',
      channels:       ['website', 'product-pages'],
      difficulty:     Difficulty.Medium,
      huntType:       HuntType.MysteryDraw,
      prize:          '0.05',
      numClues:       4,
    },
  })

  const [channels, setChannels] = useState<string[]>(['website', 'product-pages'])
  const [sourceMode, setSourceMode] = useState<'url' | 'description'>('url')

  const toggleChannel = (id: string) =>
    setChannels(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])

  const onSubmit = (data: AIHuntGenerationInput) => {
    const source = sourceMode === 'url'
      ? { businessUrl: data.businessUrl, businessDescription: undefined }
      : { businessUrl: undefined, businessDescription: data.businessDescription }
    onGenerate({ ...data, ...source, channels })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <p className="text-gold text-sm font-medium uppercase tracking-wider mb-1">Create with AI</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-bright mb-2">
          Tell us about your business.
        </h1>
        <p className="text-dim">We'll turn your content into a treasure hunt.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSourceMode('url')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                sourceMode === 'url'
                  ? 'border-gold/50 bg-gold/10 text-gold'
                  : 'border-border text-dim hover:border-gold/20',
              )}
            >
              Use website URL
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('description')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                sourceMode === 'description'
                  ? 'border-gold/50 bg-gold/10 text-gold'
                  : 'border-border text-dim hover:border-gold/20',
              )}
            >
              Describe my business instead
            </button>
          </div>
          {sourceMode === 'url' ? (
            <>
              <label className="input-label">Business Website URL *</label>
              <input
                {...register('businessUrl', { required: sourceMode === 'url' })}
                type="url"
                placeholder="https://yourstore.com"
                className="input-field"
              />
            </>
          ) : (
            <>
              <label className="input-label">Describe Your Business *</label>
              <textarea
                {...register('businessDescription', { required: sourceMode === 'description' })}
                rows={4}
                placeholder="e.g. We sell handmade linen clothing focused on sustainable, natural fabrics. Our flagship product is a summer linen shirt made from organic flax..."
                className="input-field resize-none"
              />
              <p className="text-muted text-xs mt-1">
                No website to scrape? Describe your business, products, and story instead —
                the AI will ground clues in what you write here.
              </p>
            </>
          )}
        </div>
        <div>
          <label className="input-label">Business Name *</label>
          <input {...register('businessName', { required: true })} placeholder="e.g. Linen & Co." className="input-field" />
        </div>
        <div>
          <label className="input-label">Business Type</label>
          <select {...register('businessType')} className="input-field">
            {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Campaign / Objective *</label>
          <input
            {...register('campaign', { required: true })}
            placeholder="e.g. Promote our Summer Linen Collection"
            className="input-field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Target Audience</label>
          <input
            {...register('targetAudience')}
            placeholder="e.g. Fashion-conscious adults 25–40 interested in sustainable clothing"
            className="input-field"
          />
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="input-label">Where should players search?</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {CONTENT_CHANNELS.map(ch => (
            <button
              key={ch.id}
              type="button"
              onClick={() => toggleChannel(ch.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
                channels.includes(ch.id)
                  ? 'border-gold/50 bg-gold/10 text-gold'
                  : 'border-border text-dim hover:border-gold/20',
              )}
            >
              <span>{ch.icon}</span> {ch.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="input-label">Difficulty</label>
          <select {...register('difficulty')} className="input-field">
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Hunt Type</label>
          <select {...register('huntType')} className="input-field">
            {HUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">Prize (ETH)</label>
          <input {...register('prize')} type="number" step="0.001" min="0.001" className="input-field" placeholder="0.05" />
        </div>
        <div>
          <label className="input-label">Number of Clues</label>
          <input
            {...register('numClues', { valueAsNumber: true, min: 2, max: 10 })}
            type="number"
            step="1"
            min="2"
            max="10"
            className="input-field"
            placeholder="4"
          />
        </div>
      </div>

      <button type="submit" className="btn-arcane w-full justify-center py-4 text-base">
        <Sparkles className="w-5 h-5" />
        Generate Hunt
      </button>

      <p className="text-muted text-xs text-center">
        AI will generate a draft for your review. Nothing is published automatically.
      </p>
    </form>
  )
}

// ─── Pipeline progress ────────────────────────────────────────────────────────

function GeneratingView({ currentStep }: { currentStep: PipelineStep }) {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-2xl bg-arcane/10 border border-arcane/30 flex items-center justify-center"
      >
        <Sparkles className="w-8 h-8 text-arcane-light" />
      </motion.div>
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-bright mb-2">Generating your hunt...</h2>
        <p className="text-dim text-sm">AI is analysing your business content.</p>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {PIPELINE_STEPS.map(({ key, label, isGraph }) => {
          const idx   = PIPELINE_STEPS.findIndex(s => s.key === currentStep)
          const myIdx = PIPELINE_STEPS.findIndex(s => s.key === key)
          const done   = myIdx < idx
          const active = key === currentStep

          return (
            <motion.div
              key={key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl text-sm transition-all',
                active && isGraph && 'bg-info/10 text-info border border-info/20',
                active && !isGraph && 'bg-arcane/10 text-arcane-light',
                done   && isGraph && 'text-info',
                done   && !isGraph && 'text-success',
                !active && !done && 'text-muted',
              )}
            >
              {done && isGraph  && <Database className="w-4 h-4 shrink-0" />}
              {done && !isGraph && <CheckCircle className="w-4 h-4 shrink-0" />}
              {active           && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
              {!done && !active && <div className="w-4 h-4 rounded-full border border-border shrink-0" />}
              <span>{label}</span>
              {isGraph && (active || done) && (
                <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20 shrink-0">
                  The Graph
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── The Graph data panel ─────────────────────────────────────────────────────
// Shown in the review step to surface the live on-chain analytics that
// informed the AI's prize, difficulty, and clue-count recommendations.

function GraphDataPanel({ rec }: { rec: GraphRecommendations }) {
  const ctx   = rec.platformContext
  const isLive = rec.source === 'live'

  // Shorten the subgraph URL for display
  const displayUrl = ctx.dataSource.length > 60
    ? ctx.dataSource.slice(0, 57) + '…'
    : ctx.dataSource

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border-info/20 bg-info/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-info/10">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-info" />
          <span className="text-info text-sm font-semibold">The Graph — Live Analytics</span>
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded border',
            isLive
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-warning/10 text-warning border-warning/20'
          )}>
            {isLive ? '● Live data' : '○ Fallback'}
          </span>
        </div>
        <a
          href={ctx.dataSource}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-info text-xs flex items-center gap-1 transition-colors"
          title={ctx.dataSource}
        >
          Subgraph Studio <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Platform stats */}
        <div>
          <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3">
            Platform Data ({ctx.sampleSize} hunts sampled)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Hunts',    value: ctx.totalHunts.toLocaleString() },
              { label: 'Total Players',  value: ctx.totalParticipants.toLocaleString() },
              { label: 'ETH Distributed',value: `${ctx.totalPrizeEth.toFixed(2)} ETH` },
              { label: 'Avg Completion', value: `${ctx.avgCompletionRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface/60 rounded-xl p-2.5">
                <p className="text-muted text-[10px] mb-0.5">{label}</p>
                <p className="text-bright text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <p className="text-dim text-xs font-medium uppercase tracking-wider mb-3">
            AI Recommendations (from live data)
          </p>
          <div className="space-y-2">
            {[
              {
                icon: TrendingUp,
                label: 'Prize',
                value: `${rec.recommendedPrizeEth} ETH`,
                sub:   `Range: ${rec.prizeRangeEth.min}–${rec.prizeRangeEth.max} ETH`,
                color: 'text-gold',
              },
              {
                icon: BarChart3,
                label: 'Difficulty',
                value: rec.recommendedDifficulty.charAt(0).toUpperCase() + rec.recommendedDifficulty.slice(1),
                sub:   'Best completion rate on-chain',
                color: 'text-arcane-light',
              },
              {
                icon: ShieldCheck,
                label: 'Clue Count',
                value: `${rec.recommendedClueCount} clues`,
                sub:   'Modal count in solved hunts',
                color: 'text-success',
              },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="flex items-center gap-3 bg-surface/60 rounded-xl px-3 py-2">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-muted text-[10px]">{label}</p>
                  <p className={cn('text-sm font-semibold leading-none', color)}>{value}</p>
                </div>
                <p className="text-muted text-[10px] text-right hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rationales */}
      <div className="border-t border-info/10 px-5 py-3">
        <details className="group">
          <summary className="text-muted text-xs cursor-pointer hover:text-dim transition-colors select-none flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
            View recommendation rationales from The Graph
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {[
              { label: 'Prize',       text: rec.prizeRationale },
              { label: 'Difficulty',  text: rec.difficultyRationale },
              { label: 'Clue count',  text: rec.clueCountRationale },
              { label: 'Hunt type',   text: rec.huntTypeRationale },
            ].map(({ label, text }) => (
              <div key={label} className="flex gap-2">
                <span className="text-info font-medium shrink-0 w-20">{label}:</span>
                <span className="text-dim leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-muted text-[10px] mt-2 font-mono break-all">
            Source: {displayUrl} · Queried {new Date(ctx.queriedAt).toLocaleTimeString()}
          </p>
        </details>
      </div>
    </motion.div>
  )
}

// ─── Generated hunt review ────────────────────────────────────────────────────

function GeneratedHuntReview({
  draft,
  input,
  onClueUpdate,
  onClueRegenerate,
  onClueDelete,
  onRegenerate,
  onPublish,
  txStatus,
  isPending,
}: {
  draft:             AIGeneratedHunt & { graphRecommendations?: GraphRecommendations }
  input:             AIHuntGenerationInput
  onClueUpdate:      (idx: number, updates: Partial<AIGeneratedClue>) => void
  onClueRegenerate:  (idx: number) => void
  onClueDelete:      (idx: number) => void
  onRegenerate:      () => void
  onPublish:         () => void
  txStatus:          any
  isPending:         boolean
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [showAnswer, setShowAnswer]  = useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary header */}
      <div className="card p-6 border-arcane/20 bg-arcane/5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-arcane-light text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Hunt Generated
            </p>
            <h2 className="font-serif text-2xl font-bold text-bright">{draft.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-muted text-xs mb-0.5">AI Confidence</p>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-arcane-light rounded-full"
                  style={{ width: `${(draft.confidence ?? 0.9) * 100}%` }}
                />
              </div>
              <span className="text-arcane-light text-xs font-bold">
                {Math.round((draft.confidence ?? 0.9) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Analysis summary */}
        <div className="flex flex-wrap gap-3 text-xs text-dim">
          {draft.analysedPages    && <span className="badge badge-gray">✓ {draft.analysedPages} pages</span>}
          {draft.analysedProducts && <span className="badge badge-gray">✓ {draft.analysedProducts} products</span>}
          {draft.analysedBlogs    && <span className="badge badge-gray">✓ {draft.analysedBlogs} blog posts</span>}
          <span className="badge badge-arcane">✓ {draft.clues.length} clues generated</span>
          <span className="badge badge-green">✓ All locations found</span>
        </div>
      </div>

      {/* The Graph data panel */}
      {draft.graphRecommendations && (
        <GraphDataPanel rec={draft.graphRecommendations} />
      )}

      {/* Clues */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-bright">Generated Clues</h3>
          <p className="text-muted text-xs">Review and edit each clue before publishing</p>
        </div>

        <div className="space-y-4">
          {draft.clues.map((clue, idx) => (
            <div key={idx} className="card border-border">
              {/* Clue header */}
              <div className="p-4 flex items-start gap-3">
                <span className="text-gold text-xs font-mono font-bold shrink-0 mt-1">
                  CLUE {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  {editingIdx === idx ? (
                    <textarea
                      rows={3}
                      value={clue.text}
                      onChange={e => onClueUpdate(idx, { text: e.target.value })}
                      className="input-field resize-none text-sm w-full"
                    />
                  ) : (
                    <p className="font-serif italic text-body text-sm leading-relaxed">
                      "{clue.text}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="btn-ghost p-1.5 text-xs"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onClueRegenerate(idx)}
                    className="btn-ghost p-1.5 text-xs"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onClueDelete(idx)}
                    className="btn-ghost p-1.5 text-xs text-muted hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Placement card */}
              <div className="mx-4 mb-4 rounded-xl bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-gold text-xs font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  Place This Clue Here
                </div>

                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-dim text-xs">{clue.location.page}</span>
                  {clue.location.section && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted" />
                      <span className="text-dim text-xs">{clue.location.section}</span>
                    </>
                  )}
                  {clue.locationFound && (
                    <span className="badge badge-green text-[10px] ml-auto">✓ Location found</span>
                  )}
                </div>

                <div className="divider" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted mb-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Why?
                    </p>
                    <p className="text-dim leading-relaxed">{clue.reason}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Merchant Action</p>
                    <p className="text-dim leading-relaxed">{clue.merchantAction}</p>
                  </div>
                </div>

                <div className="divider" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted text-xs mb-0.5">Answer</p>
                    <p className="text-body text-sm font-medium">{spoilerSafe(clue.answer)}</p>
                  </div>
                  {clue.location.url && (
                    <a
                      href={clue.location.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost text-xs py-1 text-arcane-light"
                    >
                      View page ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final answer preview */}
      <div className="card p-5 border-gold/20">
        <h3 className="font-semibold text-bright mb-3 text-sm">Final Answer</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <p className={cn('font-mono text-sm', showAnswer ? 'text-bright' : 'blur-sm select-none')}>
              {draft.finalAnswer}
            </p>
          </div>
          <button onClick={() => setShowAnswer(!showAnswer)} className="btn-ghost p-2">
            {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-muted text-xs mt-2">
          Hash: <span className="font-mono">{hashAnswer(draft.finalAnswer).slice(0, 20)}...</span>
          &nbsp;— only this hash will be stored on-chain.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="card p-4 border-arcane/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-arcane-light shrink-0 mt-0.5" />
        <p className="text-dim text-xs leading-relaxed">
          <span className="text-bright font-medium">Review required. </span>
          AI generates a draft, not a final product. You have full control to edit,
          regenerate, or delete any clue before publishing. Nothing is published automatically.
          You remain responsible for placing clues on your website.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onRegenerate} className="btn-secondary flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Regenerate All
        </button>
        <TxButton
          onClick={onPublish}
          txState={txStatus.state}
          isPending={isPending}
          variant="arcane"
          className="flex-1 justify-center"
        >
          <Sparkles className="w-4 h-4" />
          Fund & Publish Hunt
        </TxButton>
      </div>
      <TxStatusBanner status={txStatus} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AICreatePage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [phase, setPhase]       = useState<'input' | 'generating' | 'review'>('input')
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle')
  const [draft, setDraft]       = useState<(AIGeneratedHunt & { graphRecommendations?: GraphRecommendations }) | null>(null)
  const [input, setInput]       = useState<AIHuntGenerationInput | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const { createHunt, txStatus, isPending, isSuccess, newHuntId } = useCreateHunt()

  const handleGenerate = async (formInput: AIHuntGenerationInput) => {
    setInput(formInput)
    setPhase('generating')
    setError(null)
    try {
      const result = await generateHunt(formInput, setPipelineStep)
      setDraft(result)
      setPhase('review')
    } catch (err: any) {
      setError(err?.message || 'AI generation failed. Please try again or create manually.')
      setPhase('input')
    }
  }

  const handleClueUpdate = (idx: number, updates: Partial<AIGeneratedClue>) => {
    if (!draft) return
    const clues = [...draft.clues]
    clues[idx] = { ...clues[idx], ...updates }
    setDraft({ ...draft, clues })
  }

  const handleClueRegenerate = async (idx: number) => {
    if (!draft || !input) return
    try {
      const regen = await regenerateClue(draft.clues[idx], {
        businessName: input.businessName,
        businessUrl:  input.businessUrl,
        businessDescription: input.businessDescription,
      })
      handleClueUpdate(idx, regen)
    } catch { /* silent */ }
  }

  const handleClueDelete = (idx: number) => {
    if (!draft) return
    const clues = draft.clues.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i + 1 }))
    setDraft({ ...draft, clues })
  }

  const handlePublish = async () => {
    if (!draft || !input) return
    await createHunt({
      clueAnswers: draft.clues.map(c => c.answer),
      huntType:    draft.huntType,
      endTime:     Math.floor(Date.now() / 1000) + 7 * 86400,
      prizeEth:    draft.suggestedPrize || input.prize,
    })
  }

  // Publish metadata once the hunt is confirmed on-chain — signed by the
  // creator so the backend can verify it against the on-chain creator address.
  useEffect(() => {
    if (!isSuccess || !newHuntId || published || !address || !draft || !input) return

    const publish = async () => {
      try {
        const signature = await signMessageAsync({ message: metadataPublishMessage(newHuntId) })
        await saveHuntMetadata({
          huntId: newHuntId,
          title: draft.title,
          description: draft.description,
          story: draft.story,
          difficulty: draft.difficulty,
          category: 'Business',
          tags: ['ai-generated', 'business'],
          clues: draft.clues.map(c => ({
            order: c.order,
            text: c.text,
            url: c.location?.url,
            page: c.location?.page,
            section: c.location?.section,
            label: c.location?.label,
          })),
          isBusiness: true,
          businessName: input.businessName,
          businessLogo: '🏢',
          isAiGenerated: true,
          aiConfidence: draft.confidence,
          creator: address,
        }, signature)
      } catch (err) {
        setMetadataError(err instanceof Error ? err.message : 'Failed to publish hunt metadata.')
      } finally {
        setPublished(true)
      }
    }
    publish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, newHuntId, published, address])

  // Success state
  if (isSuccess) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-arcane/10 border border-arcane/30 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-arcane-light" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-bright mb-2">🎉 AI Hunt is Live!</h1>
            <p className="text-dim">Your AI-generated business hunt has been published.</p>
          </div>
          {metadataError && (
            <div className="card w-full p-4 border-danger/30 bg-danger/5 text-danger text-sm text-left">
              Hunt is live on-chain, but publishing its title/clue text failed: {metadataError}.
              Players can still solve it, but the page may only show "Hunt #{newHuntId}" until this is fixed.
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => navigate(`/hunt/${newHuntId ?? '1'}`)} className="btn-arcane">View Hunt</button>
            <button onClick={() => navigate('/business')} className="btn-secondary">Dashboard</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container-page max-w-3xl py-12">
      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error && (
              <div className="card p-4 border-danger/30 bg-danger/5 flex items-center gap-3 mb-6 text-sm text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <InputForm onGenerate={handleGenerate} />
          </motion.div>
        )}

        {phase === 'generating' && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingView currentStep={pipelineStep} />
          </motion.div>
        )}

        {phase === 'review' && draft && input && (
          <motion.div key="review" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GeneratedHuntReview
              draft={draft}
              input={input}
              onClueUpdate={handleClueUpdate}
              onClueRegenerate={handleClueRegenerate}
              onClueDelete={handleClueDelete}
              onRegenerate={() => { setPhase('input'); setDraft(null) }}
              onPublish={handlePublish}
              txStatus={txStatus}
              isPending={isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
