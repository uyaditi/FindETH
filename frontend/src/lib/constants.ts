import { Difficulty, HuntType, type Plan, type PlanTier } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Hunt metadata
// ─────────────────────────────────────────────────────────────────────────────

export const DIFFICULTIES: { value: Difficulty; label: string; color: string; description: string }[] = [
  { value: Difficulty.Easy,   label: 'Easy',   color: 'text-success',      description: 'Perfect for beginners. Clues are straightforward.' },
  { value: Difficulty.Medium, label: 'Medium', color: 'text-gold',         description: 'Requires some exploration and lateral thinking.' },
  { value: Difficulty.Hard,   label: 'Hard',   color: 'text-arcane-light', description: 'Challenging clues spread across many locations.' },
  { value: Difficulty.Expert, label: 'Expert', color: 'text-danger',       description: 'Only the most dedicated hunters will succeed.' },
]

export const HUNT_TYPES: { value: HuntType; label: string; icon: string; description: string }[] = [
  {
    value:       HuntType.Race,
    label:       'Race',
    icon:        '🏁',
    description: 'First correct solver wins. Speed is everything.',
  },
  {
    value:       HuntType.MysteryDraw,
    label:       'Mystery Draw',
    icon:        '🎲',
    description: 'Every correct solver enters the draw. Chainlink VRF selects the winner fairly.',
  },
]

export const HUNT_CATEGORIES = [
  'General',
  'Fashion',
  'Technology',
  'Gaming',
  'Food & Drink',
  'Travel',
  'Art & Culture',
  'Business',
  'Education',
  'Entertainment',
  'Sports',
  'Nature',
  'Mystery',
  'History',
  'Blockchain',
]

export const CONTENT_CHANNELS = [
  { id: 'website',       label: 'Website',       icon: '🌐' },
  { id: 'product-pages', label: 'Product Pages',  icon: '🛍️' },
  { id: 'blog',          label: 'Blog',           icon: '📝' },
  { id: 'social',        label: 'Social Media',   icon: '📱' },
  { id: 'physical',      label: 'Physical Store', icon: '🏪' },
]

export const BUSINESS_TYPES = [
  'Fashion / Clothing',
  'Restaurant / Food',
  'Hotel / Travel',
  'E-commerce',
  'Technology',
  'Education / University',
  'Event / Entertainment',
  'Gaming / Community',
  'Health & Wellness',
  'Real Estate',
  'Other',
]

// ─────────────────────────────────────────────────────────────────────────────
// Platform plans
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    id:          'free',
    name:        'Free',
    description: 'Start creating hunts manually.',
    features: [
      'Manual hunt creation',
      '1 active hunt',
      'Basic branding',
      'Platform-hosted URL',
      'Race & Mystery Draw modes',
    ],
    maxHunts:    1,
    aiEnabled:   false,
    customBrand: false,
    analytics:   false,
    customDomain: false,
  },
  hosted: {
    id:          'hosted',
    name:        'Hosted',
    description: 'More hunts, custom branding, analytics.',
    features: [
      'Everything in Free',
      'Up to 5 active hunts',
      'Custom logo & colours',
      'Shareable custom URLs',
      'Basic analytics',
      'Priority support',
    ],
    maxHunts:    5,
    aiEnabled:   false,
    customBrand: true,
    analytics:   true,
    customDomain: false,
  },
  ai: {
    id:          'ai',
    name:        'AI Personalised',
    description: 'Let AI turn your business content into a hunt.',
    features: [
      'Everything in Hosted',
      'AI business content analysis',
      'AI-generated clues & placement',
      'Hunt optimisation & quality check',
      'Up to 20 active hunts',
      'Campaign analytics',
      'Branded hunt experience',
    ],
    maxHunts:    20,
    aiEnabled:   true,
    customBrand: true,
    analytics:   true,
    customDomain: false,
  },
  enterprise: {
    id:          'enterprise',
    name:        'Enterprise',
    description: 'White-label, custom domain, unlimited scale.',
    features: [
      'Everything in AI Personalised',
      'Custom domain',
      'No platform branding',
      'Unlimited hunts',
      'Embed anywhere',
      'API access',
      'Dedicated infrastructure',
      'Custom integrations',
    ],
    maxHunts:    Infinity,
    aiEnabled:   true,
    customBrand: true,
    analytics:   true,
    customDomain: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Subgraph
// ─────────────────────────────────────────────────────────────────────────────

export const SUBGRAPH_URL =
  import.meta.env.VITE_SUBGRAPH_URL ||
  'https://api.studio.thegraph.com/query/placeholder/internet-treasure-hunts/v0.0.1'

// ─────────────────────────────────────────────────────────────────────────────
// ENS
// ─────────────────────────────────────────────────────────────────────────────

export const ENS_MAINNET_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'

// ─────────────────────────────────────────────────────────────────────────────
// Chainlink VRF (Sepolia)
// https://docs.chain.link/vrf/v2/subscription/supported-networks
// ─────────────────────────────────────────────────────────────────────────────

export const CHAINLINK_VRF_SEPOLIA = {
  coordinator: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
  keyHash:     '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
  linkToken:   '0x779877A7B0D9E8603169DdbD7836e478b4624789',
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE  = 12
export const MAX_CLUES       = 20
export const MIN_PRIZE_ETH   = 0.001  // minimum prize in ETH
export const MAX_TAGS        = 5
export const MAX_TITLE_LEN   = 80
export const MAX_DESC_LEN    = 300
export const MAX_STORY_LEN   = 1000
export const MAX_CLUE_LEN    = 500

export const PLATFORM_NAME   = 'Internet Treasure Hunts'
export const PLATFORM_TAGLINE = 'Turn the internet into a treasure map.'
