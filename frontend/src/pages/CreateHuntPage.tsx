import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, PenLine, ChevronRight, Zap, Shuffle } from 'lucide-react'

export default function CreateHuntPage() {
  const navigate = useNavigate()

  return (
    <div className="container-page max-w-3xl py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-bright mb-4">
          Create Your Hunt
        </h1>
        <p className="text-body text-lg max-w-xl mx-auto">
          Design an internet treasure hunt. Hide clues. Set a prize. Let the world solve it.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* AI Create */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/create/ai')}
          className="card p-8 text-left border-arcane/20 hover:border-arcane/50 hover:shadow-glow-arcane group transition-all duration-300 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-arcane/10 border border-arcane/30 flex items-center justify-center mb-5 group-hover:bg-arcane/20 transition-colors">
            <Sparkles className="w-6 h-6 text-arcane-light" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-xl font-bold text-bright">AI Create</h2>
            <span className="badge badge-arcane text-[10px]">Recommended</span>
          </div>
          <p className="text-dim text-sm leading-relaxed mb-6">
            Let AI design the hunt around your business, website, or content.
            Get personalised clues with exact placement instructions.
          </p>
          <ul className="space-y-1.5 text-xs text-dim mb-6">
            {[
              'AI analyses your website & content',
              'Generates clues + placement instructions',
              'You review & approve everything',
              'Perfect for businesses & campaigns',
            ].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-arcane-light shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1 text-arcane-light text-sm font-medium group-hover:gap-2 transition-all">
            Create with AI <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Manual Create */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/create/manual')}
          className="card p-8 text-left hover:border-gold/30 hover:shadow-glow-gold group transition-all duration-300 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-5 group-hover:bg-gold/20 transition-colors">
            <PenLine className="w-6 h-6 text-gold" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-xl font-bold text-bright">Create Manually</h2>
          </div>
          <p className="text-dim text-sm leading-relaxed mb-6">
            Build every clue yourself. Full control over the story,
            difficulty, rewards, and structure.
          </p>
          <ul className="space-y-1.5 text-xs text-dim mb-6">
            {[
              'Write your own clues',
              'Set any difficulty & structure',
              'Custom story & branding',
              'Full creative control',
            ].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1 text-gold text-sm font-medium group-hover:gap-2 transition-all">
            Create manually <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Hunt type info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10 card p-6"
      >
        <h3 className="font-semibold text-bright mb-4 text-sm">Hunt Types</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="font-medium text-bright text-sm">🏁 Race</p>
              <p className="text-dim text-xs">First correct solver wins everything. Speed matters.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-arcane/10 border border-arcane/20 flex items-center justify-center shrink-0">
              <Shuffle className="w-4 h-4 text-arcane-light" />
            </div>
            <div>
              <p className="font-medium text-bright text-sm">🎲 Mystery Draw</p>
              <p className="text-dim text-xs">All correct solvers enter. Chainlink VRF picks the winner fairly.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
