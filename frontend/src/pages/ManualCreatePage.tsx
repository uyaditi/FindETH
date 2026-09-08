import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  ChevronRight, ChevronLeft, Plus, Trash2, GripVertical,
  Eye, EyeOff, ShieldCheck, Sparkles, CheckCircle,
  Zap, Shuffle, Copy,
} from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'


import { useCreateHunt } from '@/hooks/useHuntActions'
import TxButton from '@/components/ui/TxButton'
import TxStatusBanner from '@/components/ui/TxStatusBanner'
import { cn, copyToClipboard, formatEth } from '@/lib/utils'
import { hashAnswer, spoilerSafe } from '@/lib/answerHash'
import {
  DIFFICULTIES, HUNT_TYPES, HUNT_CATEGORIES,
  MAX_CLUES, MAX_TITLE_LEN, MAX_DESC_LEN,
} from '@/lib/constants'
import { HuntType, Difficulty, type ClueFormItem } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'The Mystery' },
  { n: 2, label: 'The Clues'   },
  { n: 3, label: 'The Reward'  },
  { n: 4, label: 'Final Answer' },
  { n: 5, label: 'Review'      },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10 overflow-x-auto no-scrollbar pb-1">
      {STEPS.map(({ n, label }, i) => (
        <div key={n} className="flex items-center shrink-0">
          <div className={cn(
            'step-dot text-[11px]',
            n < current  && 'step-dot-complete',
            n === current && 'step-dot-active',
            n > current  && 'step-dot-inactive',
          )}>
            {n < current ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          <span className={cn(
            'ml-1.5 text-xs hidden sm:block',
            n === current ? 'text-bright font-medium' : 'text-muted',
          )}>
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'w-8 sm:w-12 h-px mx-2',
              n < current ? 'bg-gold/40' : 'bg-border',
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Clue editor
// ─────────────────────────────────────────────────────────────────────────────

function ClueEditor({
  clue, index, onUpdate, onRemove,
}: {
  clue: ClueFormItem
  index: number
  onUpdate: (id: string, updates: Partial<ClueFormItem>) => void
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className="card border-border">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-muted shrink-0" />
        <span className="text-gold text-xs font-mono font-bold shrink-0">
          CLUE {String(index + 1).padStart(2, '0')}
        </span>
        <p className="flex-1 text-sm text-dim truncate italic">
          {clue.text ? `"${clue.text}"` : 'Empty clue'}
        </p>
        <button
          onClick={e => { e.stopPropagation(); onRemove(clue.id) }}
          className="text-muted hover:text-danger transition-colors p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className={cn('w-4 h-4 text-muted transition-transform', expanded && 'rotate-90')} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border">
              <div className="sm:col-span-2">
                <label className="input-label">Clue Text *</label>
                <textarea
                  rows={3}
                  placeholder='e.g. "Where nature becomes something you can wear..."'
                  value={clue.text}
                  onChange={e => onUpdate(clue.id, { text: e.target.value })}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="input-label">Expected Answer *</label>
                <input
                  type="text"
                  placeholder="e.g. linen"
                  value={clue.answer}
                  onChange={e => onUpdate(clue.id, { answer: e.target.value })}
                  className="input-field"
                />
                <p className="text-muted text-xs mt-1">Normalised before hashing (trim + lowercase)</p>
              </div>
              <div>
                <label className="input-label">Hint (optional)</label>
                <input
                  type="text"
                  placeholder="Optional hint for players"
                  value={clue.hint}
                  onChange={e => onUpdate(clue.id, { hint: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Location / Page</label>
                <input
                  type="text"
                  placeholder="e.g. Website → Linen Collection"
                  value={clue.page}
                  onChange={e => onUpdate(clue.id, { page: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/page"
                  value={clue.url}
                  onChange={e => onUpdate(clue.id, { url: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main wizard
// ─────────────────────────────────────────────────────────────────────────────

export default function ManualCreatePage() {
  const navigate  = useNavigate()
  const chainId   = useChainId()
  const { address } = useAccount()

  const [step, setStep]           = useState(1)
  const [clues, setClues]         = useState<ClueFormItem[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [published, setPublished]  = useState(false)
  const [newHuntId, setNewHuntId]  = useState<string>()

  const { createHunt, txStatus, isPending, isSuccess } = useCreateHunt()

  const { register, watch, handleSubmit, formState: { errors }, getValues } = useForm({
    defaultValues: {
      title:       '',
      description: '',
      story:       '',
      difficulty:  Difficulty.Medium,
      category:    'General',
      huntType:    HuntType.Race,
      prize:       '0.05',
      finalAnswer: '',
      endDays:     '7',
      isBusiness:  false,
      businessName: '',
    },
  })

  const watchedHuntType    = watch('huntType')
  const watchedFinalAnswer = watch('finalAnswer')
  const watchedPrize       = watch('prize')

  // ── Clue management ──────────────────────────────────────────────────────

  const addClue = () => {
    if (clues.length >= MAX_CLUES) return
    setClues(c => [...c, {
      id:      crypto.randomUUID(),
      order:   c.length + 1,
      text:    '',
      hint:    '',
      answer:  '',
      page:    '',
      url:     '',
      imageUrl: '',
    }])
  }

  const updateClue = (id: string, updates: Partial<ClueFormItem>) =>
    setClues(c => c.map(cl => cl.id === id ? { ...cl, ...updates } : cl))

  const removeClue = (id: string) =>
    setClues(c => c.filter(cl => cl.id !== id).map((cl, i) => ({ ...cl, order: i + 1 })))

  // ── Publish ───────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    const values  = getValues()
    const endDays = parseInt(values.endDays, 10)
    const endTime = endDays > 0
      ? Math.floor(Date.now() / 1000) + endDays * 86400
      : 0

    try {
      const hash = await createHunt({
        finalAnswer: values.finalAnswer,
        huntType:    Number(values.huntType) as HuntType,
        endTime,
        prizeEth:    values.prize,
      })
      if (hash) {
        setPublished(true)
        setNewHuntId('1') // In production parse from receipt logs
      }
    } catch { /* error handled by hook */ }
  }

  const next = () => setStep(s => Math.min(s + 1, 5))
  const prev = () => setStep(s => Math.max(s - 1, 1))

  // ── Step validation ───────────────────────────────────────────────────────

  const canAdvance = () => {
    const v = getValues()
    if (step === 1) return v.title.trim().length > 0 && v.description.trim().length > 0
    if (step === 2) return clues.length > 0 && clues.every(c => c.text.trim() && c.answer.trim())
    if (step === 3) return parseFloat(v.prize) > 0
    if (step === 4) return v.finalAnswer.trim().length > 0
    return true
  }

  // ── Published success ────────────────────────────────────────────────────

  if (published || isSuccess) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-gold" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-bright mb-2">🎉 Your Hunt is Live!</h1>
            <p className="text-dim">Share your hunt and let the world solve it.</p>
          </div>
          <div className="card w-full p-4 flex gap-2">
            <input
              readOnly
              value={`${window.location.origin}/hunt/${newHuntId ?? '1'}`}
              className="input-field text-sm py-2 flex-1"
            />
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/hunt/${newHuntId ?? '1'}`)}
              className="btn-secondary px-3 py-2 text-xs"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/hunt/${newHuntId ?? '1'}`)} className="btn-primary">
              View Hunt
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-bright mb-1">Create Manually</h1>
        <p className="text-dim text-sm">Build your hunt step by step.</p>
      </div>

      <StepBar current={step} />

      <AnimatePresence mode="wait">
        {/* ── STEP 1: The Mystery ──────────────────────────────────────── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
            <div>
              <label className="input-label">Hunt Title *</label>
              <input
                {...register('title', { required: true, maxLength: MAX_TITLE_LEN })}
                placeholder="e.g. The Summer Secret"
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Short Description *</label>
              <textarea
                {...register('description', { required: true, maxLength: MAX_DESC_LEN })}
                rows={3}
                placeholder="What's this hunt about? (shown on explore page)"
                className="input-field resize-none"
              />
            </div>
            <div>
              <label className="input-label">Story / Narrative (optional)</label>
              <textarea
                {...register('story')}
                rows={4}
                placeholder='Set the scene... e.g. "In the depths of the internet, a secret awaits..."'
                className="input-field resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Difficulty</label>
                <select {...register('difficulty')} className="input-field">
                  {DIFFICULTIES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Category</label>
                <select {...register('category')} className="input-field">
                  {HUNT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: The Clues ────────────────────────────────────────── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-bright font-medium">Clues ({clues.length}/{MAX_CLUES})</p>
                <p className="text-dim text-xs">Add clues in the order players will encounter them.</p>
              </div>
              <button onClick={addClue} disabled={clues.length >= MAX_CLUES} className="btn-primary text-sm py-2">
                <Plus className="w-4 h-4" /> Add Clue
              </button>
            </div>

            {clues.length === 0 && (
              <div className="card p-10 text-center border-dashed">
                <p className="text-muted text-sm mb-3">No clues yet.</p>
                <button onClick={addClue} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4" /> Add first clue
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {clues.map((clue, i) => (
                <ClueEditor
                  key={clue.id}
                  clue={clue}
                  index={i}
                  onUpdate={updateClue}
                  onRemove={removeClue}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: The Reward ───────────────────────────────────────── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
            {/* Hunt type */}
            <div>
              <label className="input-label">Hunt Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {HUNT_TYPES.map(t => (
                  <label
                    key={t.value}
                    className={cn(
                      'card p-4 cursor-pointer border-2 transition-all',
                      Number(watchedHuntType) === t.value
                        ? 'border-gold bg-gold/5'
                        : 'border-border hover:border-gold/30',
                    )}
                  >
                    <input type="radio" {...register('huntType')} value={t.value} className="sr-only" />
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{t.icon}</span>
                      <span className="font-semibold text-bright">{t.label}</span>
                    </div>
                    <p className="text-dim text-xs">{t.description}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Prize */}
            <div>
              <label className="input-label">Prize (ETH)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  {...register('prize', { min: 0.001 })}
                  className="input-field pr-16"
                  placeholder="0.05"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dim text-sm font-mono">ETH</span>
              </div>
              <p className="text-dim text-xs mt-1">
                This amount will be locked in the smart contract and paid to the winner.
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className="input-label">Duration (days, 0 = no deadline)</label>
              <input
                type="number"
                min="0"
                max="365"
                {...register('endDays')}
                className="input-field"
                placeholder="7"
              />
            </div>

            {/* Prize summary */}
            <div className="card p-4 bg-gold/5 border-gold/20">
              <p className="text-gold font-medium text-sm mb-1">Winner Receives</p>
              <p className="text-bright text-lg font-bold">
                ~{parseFloat(watchedPrize || '0') * 0.975} ETH
                <span className="text-dim text-sm font-normal ml-1">(after 2.5% platform fee)</span>
              </p>
              <p className="text-dim text-xs mt-1">+ 1 Treasure NFT (on-chain achievement)</p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Final Answer ─────────────────────────────────────── */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
            <div className="card p-5 border-arcane/20 bg-arcane/5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-arcane-light shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-bright text-sm mb-1">Answer Security</p>
                  <p className="text-dim text-xs leading-relaxed">
                    Your answer is cryptographically hashed before being stored on-chain.
                    Only the hash is ever stored — the plaintext is never visible on the blockchain.
                    Normalisation: trimmed + lowercased.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="input-label">Final Answer *</label>
              <div className="relative">
                <input
                  type={showAnswer ? 'text' : 'password'}
                  {...register('finalAnswer', { required: true })}
                  placeholder="Enter the final answer..."
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-bright"
                >
                  {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-dim text-xs mt-1">This is what players must ultimately discover.</p>
            </div>

            {watchedFinalAnswer && (
              <div className="card p-4 space-y-3">
                <div>
                  <p className="text-muted text-xs mb-1">Normalised form</p>
                  <p className="text-dim font-mono text-sm">{watchedFinalAnswer.trim().toLowerCase()}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">Preview (spoiler-safe)</p>
                  <p className="text-dim font-mono text-sm">{spoilerSafe(watchedFinalAnswer)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs mb-1">On-chain hash (keccak256)</p>
                  <p className="text-dim font-mono text-xs break-all">{hashAnswer(watchedFinalAnswer)}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 5: Review & Publish ─────────────────────────────────── */}
        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-5">
            {(() => {
              const v = getValues()
              return (
                <>
                  <div className="card p-6 space-y-4">
                    <h2 className="font-serif text-2xl font-bold text-bright">{v.title || '(Untitled)'}</h2>
                    {v.story && (
                      <p className="font-serif italic text-dim text-sm border-l-2 border-gold/30 pl-3">
                        "{v.story}"
                      </p>
                    )}
                    <p className="text-body text-sm">{v.description}</p>

                    <div className="divider" />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted text-xs mb-0.5">Difficulty</p>
                        <p className="text-bright capitalize">{v.difficulty}</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs mb-0.5">Type</p>
                        <p className="text-bright flex items-center gap-1">
                          {Number(v.huntType) === HuntType.Race
                            ? <><Zap className="w-3 h-3 text-gold" /> Race</>
                            : <><Shuffle className="w-3 h-3 text-arcane-light" /> Mystery Draw</>
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-muted text-xs mb-0.5">Prize</p>
                        <p className="text-gold font-bold">{v.prize} ETH</p>
                      </div>
                      <div>
                        <p className="text-muted text-xs mb-0.5">Clues</p>
                        <p className="text-bright">{clues.length}</p>
                      </div>
                    </div>

                    <div className="divider" />

                    <div>
                      <p className="text-muted text-xs mb-2">Clues</p>
                      <div className="space-y-2">
                        {clues.map((c, i) => (
                          <div key={c.id} className="flex items-start gap-2 text-sm">
                            <span className="text-gold font-mono text-xs shrink-0 mt-0.5">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="text-dim italic truncate">"{c.text}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divider" />
                    <div>
                      <p className="text-muted text-xs mb-1">Final Answer (hash only)</p>
                      <p className="text-dim font-mono text-xs break-all">{hashAnswer(v.finalAnswer)}</p>
                      <p className="text-muted text-[11px] mt-1">Your answer is protected. Only its cryptographic hash is stored on-chain.</p>
                    </div>
                  </div>

                  {/* Publish CTA */}
                  <div className="card p-5 bg-gold/5 border-gold/20">
                    <p className="text-bright font-semibold mb-1">Fund & Publish Hunt</p>
                    <p className="text-dim text-xs mb-4">
                      Publishing sends a transaction to the smart contract.
                      {v.prize} ETH will be locked as the prize.
                    </p>
                    <TxButton
                      onClick={handlePublish}
                      txState={txStatus.state}
                      isPending={isPending}
                      className="w-full justify-center"
                    >
                      <Sparkles className="w-4 h-4" />
                      Fund & Publish Hunt
                    </TxButton>
                    <TxStatusBanner status={txStatus} className="mt-3" />
                  </div>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border">
        <button
          onClick={step === 1 ? () => navigate('/create') : prev}
          className="btn-ghost flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < 5 && (
          <button
            onClick={next}
            disabled={!canAdvance()}
            className="btn-primary disabled:opacity-40"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
