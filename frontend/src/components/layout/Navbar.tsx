import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Compass, Trophy, LayoutDashboard, Sparkles, KeyRound,
  Building2, User, LogOut, ChevronDown, LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

interface NavbarProps {
  minimal?: boolean
}

const navLinks = [
  { to: '/explore',     label: 'Explore',     icon: Compass },
  { to: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
]

// ── Small user-menu dropdown ──────────────────────────────────────────────────
function UserMenu() {
  const navigate  = useNavigate()
  const { isAuthenticated, role, username, brandName, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Sign In
      </button>
    )
  }

  const isBrand   = role === 'brand'
  const display   = isBrand ? (brandName ?? 'My Brand') : (username ?? 'Player')
  const RoleIcon  = isBrand ? Building2 : User
  const roleLabel = isBrand ? 'Brand' : 'Participant'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200',
          isBrand
            ? 'bg-arcane/10 border-arcane/30 text-arcane-light hover:bg-arcane/20'
            : 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <RoleIcon className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{display}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 card p-1.5 shadow-card z-50"
          >
            {/* Role label */}
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-bright text-xs font-semibold truncate">{display}</p>
              <p className="text-muted text-[11px] mt-0.5">{roleLabel}</p>
            </div>

            {/* Brand portal link */}
            {isBrand && (
              <button
                onClick={() => { navigate('/brand-dashboard'); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-dim hover:text-bright hover:bg-surface transition-all"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Brand Dashboard
              </button>
            )}

            {/* Participant: profile link */}
            {!isBrand && (
              <button
                onClick={() => { navigate('/profile'); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-dim hover:text-bright hover:bg-surface transition-all"
              >
                <User className="w-3.5 h-3.5" />
                My Profile
              </button>
            )}

            {/* Logout */}
            <button
              onClick={() => { logout(); setOpen(false); navigate('/') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-danger/80 hover:text-danger hover:bg-danger/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar({ minimal }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 bg-void/90 backdrop-blur-md border-b border-border">
      <div className="container-page">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center
                            group-hover:bg-gold/20 transition-colors duration-200">
              <KeyRound className="w-4 h-4 text-gold" />
            </div>
            <span className="font-serif font-bold text-bright text-lg leading-none hidden sm:block">
              Treasure<span className="text-gold">Hunts</span>
            </span>
          </Link>

          {!minimal && (
            <>
              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-dim hover:text-bright hover:bg-surface'
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}
                {/* Brand portal shortcut when logged in as brand */}
                {isAuthenticated && role === 'brand' && (
                  <NavLink
                    to="/brand-dashboard"
                    className={({ isActive }) =>
                      cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-arcane/10 text-arcane-light'
                          : 'text-dim hover:text-bright hover:bg-surface'
                      )
                    }
                  >
                    Brand Portal
                  </NavLink>
                )}
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-2.5">
                {/* Create button — hide for brand (they use brand dashboard) */}
                {(!isAuthenticated || role !== 'brand') && (
                  <button
                    onClick={() => navigate('/create')}
                    className="hidden sm:flex btn-primary text-xs px-4 py-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create Hunt
                  </button>
                )}

                {/* Auth user menu */}
                <UserMenu />

                {/* Wallet connect */}
                <ConnectButton
                  showBalance={false}
                  chainStatus="icon"
                  accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
                />

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden btn-ghost p-2"
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}

          {minimal && (
            <Link to="/" className="btn-ghost text-sm">
              ← Back to hunts
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && !minimal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border bg-void/95 backdrop-blur-md overflow-hidden"
          >
            <div className="container-page py-4 flex flex-col gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-gold/10 text-gold' : 'text-dim hover:text-bright hover:bg-surface'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}

              {/* Brand Portal link on mobile */}
              {isAuthenticated && role === 'brand' && (
                <NavLink
                  to="/brand-dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-arcane/10 text-arcane-light' : 'text-dim hover:text-bright hover:bg-surface'
                    )
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  Brand Portal
                </NavLink>
              )}

              <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
                {(!isAuthenticated || role !== 'brand') && (
                  <button
                    onClick={() => { navigate('/create'); setMobileOpen(false) }}
                    className="btn-primary w-full text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Hunt
                  </button>
                )}
                {!isAuthenticated && (
                  <button
                    onClick={() => { navigate('/login'); setMobileOpen(false) }}
                    className="btn-secondary w-full text-sm"
                  >
                    <KeyRound className="w-4 h-4" />
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
