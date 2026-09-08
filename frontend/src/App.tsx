import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'

import Layout from '@/components/layout/Layout'
import LoadingScreen from '@/components/ui/LoadingScreen'

// Lazy-loaded pages for code splitting
const HomePage        = lazy(() => import('@/pages/HomePage'))
const ExplorePage     = lazy(() => import('@/pages/ExplorePage'))
const HuntDetailPage  = lazy(() => import('@/pages/HuntDetailPage'))
const PlayHuntPage    = lazy(() => import('@/pages/PlayHuntPage'))
const CreateHuntPage   = lazy(() => import('@/pages/CreateHuntPage'))
const ManualCreatePage = lazy(() => import('@/pages/ManualCreatePage'))
const AICreatePage     = lazy(() => import('@/pages/AICreatePage'))
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'))
const DashboardPage   = lazy(() => import('@/pages/DashboardPage'))
const BusinessPage    = lazy(() => import('@/pages/BusinessPage'))
const ProfilePage     = lazy(() => import('@/pages/ProfilePage'))
const NotFoundPage    = lazy(() => import('@/pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                  element={<HomePage />} />
          <Route path="/explore"           element={<ExplorePage />} />
          <Route path="/hunt/:id"          element={<HuntDetailPage />} />
          <Route path="/hunt/:id/play"     element={<PlayHuntPage />} />
          <Route path="/create"            element={<CreateHuntPage />} />
          <Route path="/create/manual"     element={<ManualCreatePage />} />
          <Route path="/create/ai"         element={<AICreatePage />} />
          <Route path="/leaderboard"       element={<LeaderboardPage />} />
          <Route path="/dashboard"         element={<DashboardPage />} />
          <Route path="/business"          element={<BusinessPage />} />
          <Route path="/profile"           element={<ProfilePage />} />
          <Route path="/profile/:address"  element={<ProfilePage />} />
          <Route path="*"                  element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
