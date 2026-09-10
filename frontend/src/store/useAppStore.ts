import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CreateHuntForm, AIGeneratedHunt, Difficulty, ClueFormItem } from '@/types'
import { HuntType } from '@/types'
import { Difficulty as D } from '@/types'

// ── Create Hunt wizard store ──────────────────────────────────────────────────

interface CreateHuntState {
  step:    number
  form:    CreateHuntForm
  aiDraft: AIGeneratedHunt | null
  isAI:    boolean

  setStep:    (step: number) => void
  nextStep:   () => void
  prevStep:   () => void
  updateForm: (updates: Partial<CreateHuntForm>) => void
  addClue:    (clue: ClueFormItem) => void
  updateClue: (id: string, updates: Partial<ClueFormItem>) => void
  removeClue: (id: string) => void
  reorderClues: (clues: ClueFormItem[]) => void
  setAIDraft: (draft: AIGeneratedHunt | null) => void
  setIsAI:    (isAI: boolean) => void
  resetWizard: () => void
}

const defaultForm: CreateHuntForm = {
  title:       '',
  description: '',
  story:       '',
  difficulty:  D.Medium,
  category:    'General',
  tags:        '',
  coverImage:  '',
  clues:       [],
  huntType:    HuntType.Race,
  prize:       '0.05',
  isBusiness:  false,
  businessName: '',
  businessLogo: '',
  accentColor:  '#f59e0b',
}

export const useCreateHuntStore = create<CreateHuntState>()(
  persist(
    (set, get) => ({
      step:    1,
      form:    defaultForm,
      aiDraft: null,
      isAI:    false,

      setStep:  (step)    => set({ step }),
      nextStep: ()        => set(s => ({ step: Math.min(s.step + 1, 5) })),
      prevStep: ()        => set(s => ({ step: Math.max(s.step - 1, 1) })),
      updateForm: (updates) => set(s => ({ form: { ...s.form, ...updates } })),

      addClue: (clue) => set(s => ({
        form: { ...s.form, clues: [...s.form.clues, clue] },
      })),

      updateClue: (id, updates) => set(s => ({
        form: {
          ...s.form,
          clues: s.form.clues.map(c => c.id === id ? { ...c, ...updates } : c),
        },
      })),

      removeClue: (id) => set(s => ({
        form: {
          ...s.form,
          clues: s.form.clues.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })),
        },
      })),

      reorderClues: (clues) => set(s => ({
        form: { ...s.form, clues: clues.map((c, i) => ({ ...c, order: i + 1 })) },
      })),

      setAIDraft: (draft) => set({ aiDraft: draft }),
      setIsAI:    (isAI)  => set({ isAI }),

      resetWizard: () => set({ step: 1, form: defaultForm, aiDraft: null, isAI: false }),
    }),
    { name: 'create-hunt-wizard' }
  )
)

// ── Global UI store ───────────────────────────────────────────────────────────

interface UIState {
  learnModeVisible: boolean
  toggleLearnMode:  () => void

  // Active hunt play state (persisted per user session)
  activeHuntProgress: Record<string, number> // huntId → current clue index
  setClueProgress:    (huntId: string, clueIndex: number) => void
  getClueProgress:    (huntId: string) => number
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      learnModeVisible: false,
      toggleLearnMode: () => set(s => ({ learnModeVisible: !s.learnModeVisible })),

      activeHuntProgress: {},
      setClueProgress: (huntId, clueIndex) =>
        set(s => ({ activeHuntProgress: { ...s.activeHuntProgress, [huntId]: clueIndex } })),
      getClueProgress: (huntId) => get().activeHuntProgress[huntId] ?? 0,
    }),
    { name: 'ui-state' }
  )
)
