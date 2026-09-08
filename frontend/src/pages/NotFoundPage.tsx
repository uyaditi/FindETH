import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
        <KeyRound className="w-10 h-10 text-gold/60" />
      </div>
      <div>
        <h1 className="font-serif text-4xl font-bold text-bright mb-2">404</h1>
        <p className="text-dim text-lg">This clue doesn't lead anywhere.</p>
      </div>
      <Link to="/" className="btn-primary">Return to Home</Link>
    </div>
  )
}
