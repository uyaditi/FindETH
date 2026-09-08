import { Link } from 'react-router-dom'
import { KeyRound, Github, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-deep mt-20">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-gold" />
              </div>
              <span className="font-serif font-bold text-bright text-lg">
                Internet Treasure<span className="text-gold">Hunts</span>
              </span>
            </div>
            <p className="text-dim text-sm leading-relaxed max-w-sm">
              Turn the internet into a treasure map. AI-powered hunts secured by Ethereum,
              with provably fair winner selection via Chainlink VRF.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="btn-ghost p-2" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="btn-ghost p-2" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-bright text-sm font-semibold mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/explore',     label: 'Explore Hunts' },
                { to: '/create',      label: 'Create Hunt' },
                { to: '/create/ai',   label: 'AI Create' },
                { to: '/leaderboard', label: 'Leaderboard' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-dim hover:text-gold text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-bright text-sm font-semibold mb-4">Technology</h4>
            <ul className="space-y-2.5 text-sm text-dim">
              <li>Ethereum</li>
              <li>Chainlink VRF</li>
              <li>ENS</li>
              <li>The Graph</li>
              <li>OpenZeppelin</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-xs">
            © 2026 Internet Treasure Hunts. All rights reserved.
          </p>
          <p className="text-muted text-xs">
            Built with Ethereum · Chainlink · ENS · The Graph
          </p>
        </div>
      </div>
    </footer>
  )
}
