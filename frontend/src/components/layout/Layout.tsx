import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  // Play page gets a minimal layout
  const isPlayPage = location.pathname.includes('/play')

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <Navbar minimal={isPlayPage} />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isPlayPage && <Footer />}
    </div>
  )
}
