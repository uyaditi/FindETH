import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles, Compass, KeyRound, Zap, Shuffle, Brain,
  ShieldCheck, BarChart3, ChevronRight, ArrowRight,
} from 'lucide-react'
import { DEMO_HUNTS } from '@/data/demoHunts'
import HuntCard from '@/components/ui/HuntCard'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 py-24">
        {/* Ambient background glows */}
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow-gold rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-arcane/10 blur-3xl pointer-events-none" />

        {/* Floating key icon */}
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mb-8"
        >
          <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-glow-gold mx-auto">
            <KeyRound className="w-10 h-10 text-gold" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-bright leading-tight mb-6">
            The Internet is full
            <br />
            <span className="text-gold text-glow-gold">of secrets.</span>
            <br />
            <span className="text-dim font-normal italic text-4xl sm:text-5xl lg:text-6xl">Find them.</span>
          </h1>

          <p className="text-body text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Discover, solve, and win — or turn your business into
            an interactive treasure hunt powered by AI and secured by Web3.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/explore')}
              className="btn-primary text-base px-8 py-4 shadow-glow-gold"
            >
              <Compass className="w-5 h-5" />
              Explore Hunts
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create')}
              className="btn-secondary text-base px-8 py-4"
            >
              Create a Hunt
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Business CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => navigate('/create/ai')}
              className="inline-flex items-center gap-2 text-arcane-light hover:text-arcane transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Turn your business into a treasure hunt
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3], y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted text-xs flex flex-col items-center gap-1"
        >
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted to-transparent" />
        </motion.div>
      </section>

      {/* ── LIVE HUNTS PREVIEW ───────────────────────────────────────────── */}
      <section className="container-page py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-gold text-sm font-medium mb-2 uppercase tracking-wider">Active Now</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-bright">
              Featured Hunts
            </h2>
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="btn-ghost hidden sm:flex items-center gap-1.5 text-sm"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMO_HUNTS.map((hunt, i) => (
            <HuntCard key={hunt.id} hunt={hunt} index={i} />
          ))}
        </div>

        <div className="flex justify-center mt-8 sm:hidden">
          <button onClick={() => navigate('/explore')} className="btn-secondary">
            View all hunts
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="container-page py-20">
        <div className="text-center mb-14">
          <p className="text-gold text-sm font-medium mb-2 uppercase tracking-wider">The Journey</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-bright">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', icon: Compass, title: 'Discover',     desc: 'Browse hunts created by individuals, businesses, and AI.' },
            { step: '02', icon: KeyRound, title: 'Solve Clues', desc: 'Follow clues hidden across websites, products, and content.' },
            { step: '03', icon: ShieldCheck, title: 'Submit',   desc: 'Your answer is hashed and verified by a smart contract.' },
            { step: '04', icon: Shuffle,  title: 'Win',         desc: 'Race to first place or enter the Chainlink VRF draw.' },
          ].map(({ step, icon: Icon, title, desc }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-5xl font-serif font-bold text-white/[0.03] select-none">
                {step}
              </div>
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-bright mb-1.5">{title}</h3>
                <p className="text-dim text-sm leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BUSINESS / AI SECTION ────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-deep to-void pointer-events-none" />
        <div className="absolute inset-0 bg-glow-gold opacity-20 pointer-events-none" />

        <div className="container-page relative">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="badge badge-arcane mb-4">For Businesses</span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-bright mb-6">
              Turn your website, products, and content into an interactive treasure hunt.
            </h2>
            <p className="text-body text-lg leading-relaxed">
              AI analyses your business content and generates a complete treasure hunt — with
              exact clue placement instructions. You review, approve, and publish. No Web3
              knowledge required.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {[
              { icon: Brain,      title: 'AI Hunt Designer',    desc: 'AI generates personalised clues from your product pages, blogs, and brand story.' },
              { icon: KeyRound,   title: 'Clue Placement',      desc: 'Every clue comes with exact placement instructions for your specific pages.' },
              { icon: ShieldCheck, title: 'Web3 Rewards',       desc: 'ETH prizes and NFT trophies are handled automatically by smart contracts.' },
              { icon: Shuffle,    title: 'Chainlink VRF',       desc: 'Winners are selected with provably fair, verifiable randomness.' },
              { icon: BarChart3,  title: 'Campaign Analytics',  desc: 'Track participants, completion rates, and engagement across your hunt.' },
              { icon: Zap,        title: 'Instant Publishing',  desc: 'One wallet confirmation and your branded hunt is live at a shareable URL.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card p-5 flex gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-arcane/10 border border-arcane/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-arcane-light" />
                </div>
                <div>
                  <h3 className="font-semibold text-bright text-sm mb-1">{title}</h3>
                  <p className="text-dim text-xs leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Business CTA */}
          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create/ai')}
              className="btn-arcane text-base px-10 py-4 shadow-glow-arcane"
            >
              <Sparkles className="w-5 h-5" />
              Create with AI
            </motion.button>
            <p className="text-muted text-xs mt-3">
              Free to start. AI features available on premium plans.
            </p>
          </div>
        </div>
      </section>

      {/* ── TECHNOLOGY STRIP ─────────────────────────────────────────────── */}
      <section className="border-y border-border py-12">
        <div className="container-page">
          <p className="text-muted text-xs text-center uppercase tracking-widest mb-8">
            Powered by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              { name: 'Ethereum',      role: 'Rewards & Ownership' },
              { name: 'Chainlink VRF', role: 'Provably Fair Draws' },
              { name: 'ENS',           role: 'Creator Identity' },
              { name: 'The Graph',     role: 'Discovery & Analytics' },
              { name: 'AI',            role: 'Hunt Generation' },
            ].map(({ name, role }) => (
              <div key={name} className="text-center">
                <p className="font-semibold text-bright text-sm mb-0.5">{name}</p>
                <p className="text-muted text-xs">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="container-page py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-bright mb-4">
            Ready to begin the hunt?
          </h2>
          <p className="text-dim text-lg mb-10 max-w-xl mx-auto">
            Discover. Solve. Win. Or create the mystery that everyone wants to solve.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/explore')}
              className="btn-primary text-base px-8 py-4"
            >
              <Compass className="w-5 h-5" />
              Explore Hunts
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create')}
              className="btn-secondary text-base px-8 py-4"
            >
              Create a Hunt
            </motion.button>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
