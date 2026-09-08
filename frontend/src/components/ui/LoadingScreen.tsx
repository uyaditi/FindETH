import { motion } from 'framer-motion'
import { KeyRound } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-void flex flex-col items-center justify-center gap-4 z-[999]">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center"
      >
        <KeyRound className="w-8 h-8 text-gold" />
      </motion.div>
      <p className="text-dim text-sm animate-pulse">Loading...</p>
    </div>
  )
}
