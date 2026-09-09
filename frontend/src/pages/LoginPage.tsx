import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, User, Building2, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react'
import { useAuthStore, type UserRole } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore(s => s.login)

  // Role toggle
  const [role, setRole] = useState<UserRole>('participant')

  // Form state
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [brandName, setBrandName] = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  // Where to go after login
  const from = (location.state as { from?: string })?.from
  const defaultRedirect = role === 'brand' ? '/brand-dashboard' : '/explore'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (role === 'brand' && !brandName.trim()) {
      setError('Please enter your brand name.')
      return
    }

    setLoading(true)
    // Simulate a brief async check
    await new Promise(r => setTimeout(r, 600))

    const ok = login(username, password, role, brandName)
    setLoading(false)

    if (ok) {
      navigate(from ?? defaultRedirect, { replace: true })
    } else {
      setError('Invalid credentials. Try username: admin, password: admin.')
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-glow-gold rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-arcane/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-glow-gold mb-4">
            <KeyRound className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-bright">
            Treasure<span className="text-gold">Hunts</span>
          </h1>
          <p className="text-dim text-sm mt-1">Sign in to continue</p>
        </div>

        {/* Role toggle */}
        <div className="card p-1.5 flex gap-1.5 mb-6">
          {([
            { value: 'participant', label: 'Participant', icon: User,      desc: 'Play hunts & win prizes' },
            { value: 'brand',      label: 'Brand / Creator', icon: Building2, desc: 'Launch campaigns' },
          ] as const).map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => { setRole(value); setError('') }}
              className={cn(
                'flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200',
                role === value
                  ? 'bg-gold text-void shadow-glow-gold'
                  : 'text-dim hover:text-bright hover:bg-surface'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold leading-none">{label}</span>
              <span className={cn(
                'text-[10px] leading-none font-normal',
                role === value ? 'text-void/70' : 'text-muted'
              )}>{desc}</span>
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="card p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, x: role === 'brand' ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Brand intro */}
              {role === 'brand' && (
                <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-arcane/5 border border-arcane/20">
                  <Sparkles className="w-4 h-4 text-arcane-light shrink-0 mt-0.5" />
                  <p className="text-dim text-xs leading-relaxed">
                    Launch interactive treasure hunts as marketing campaigns. Track engagement, distribute ETH prizes, and mint NFTs automatically.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Brand name (brand only) */}
                {role === 'brand' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="input-label">Brand Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Clothing Co."
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      className="input-field"
                      autoComplete="organization"
                    />
                  </motion.div>
                )}

                {/* Username */}
                <div>
                  <label className="input-label">Username</label>
                  <input
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="input-field"
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="input-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pr-11"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-bright transition-colors"
                      tabIndex={-1}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-danger/5 border border-danger/20 text-danger text-sm"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'mt-1 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
                    role === 'brand'
                      ? 'btn-arcane shadow-glow-arcane'
                      : 'btn-primary shadow-glow-gold',
                    loading && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <>
                      {role === 'brand' ? (
                        <><Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />Enter Brand Portal</>
                      ) : (
                        <><KeyRound className="w-4 h-4 inline mr-1.5 -mt-0.5" />Start Hunting</>
                      )}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Hint */}
        <p className="text-center text-muted text-xs mt-5">
          Demo credentials — username: <span className="text-dim font-mono">admin</span> · password: <span className="text-dim font-mono">admin</span>
        </p>

        {/* Back link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="text-dim hover:text-bright text-sm transition-colors"
          >
            ← Back to homepage
          </button>
        </div>
      </motion.div>
    </div>
  )
}
