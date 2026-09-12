import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Compass, Trophy, LayoutDashboard, Sparkles, KeyRound, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface NavbarProps {
  minimal?: boolean
}

const navLinks = [
  { to: '/explore',     label: 'Explore',     icon: Compass },
  { to: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
  { to: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
]

export default function Navbar({ minimal }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

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
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {/* Create button */}
                <button
                  onClick={() => navigate('/create')}
                  className="hidden sm:flex btn-primary text-xs px-4 py-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Create Hunt
                </button>

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="btn-ghost p-2"
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

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
            <div className="flex items-center gap-2">
              <Link to="/" className="btn-ghost text-sm">
                ← Back to hunts
              </Link>
              <button
                onClick={toggleTheme}
                className="btn-ghost p-2"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
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
              <div className="pt-2 border-t border-border mt-2 flex flex-col gap-2">
                <button
                  onClick={() => { navigate('/create'); setMobileOpen(false) }}
                  className="btn-primary w-full text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Hunt
                </button>
                <button
                  onClick={toggleTheme}
                  className="btn-secondary w-full text-sm"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
