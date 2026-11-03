import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import useAuthStore from './store/useAuthStore'
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/ProtectedRoute'
import { FullPageSpinner } from './components/ui/Spinner'

// Pages
import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import Matches      from './pages/Matches'
import LiveMatch    from './pages/LiveMatch'
import Players      from './pages/Players'
import PlayerProfile from './pages/PlayerProfile'
import AdminPanel   from './pages/admin/AdminPanel'
import CreateMatch  from './pages/admin/CreateMatch'
import TeamBuilder  from './pages/admin/TeamBuilder'
import UmpireUI     from './pages/admin/UmpireUI'
import FirstAdminSetup from './pages/admin/FirstAdminSetup'

export default function App() {
  const { init, initialized, user, bootstrapComplete } = useAuthStore()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  // Initialize Firebase auth listener once
  useEffect(() => {
    const unsub = init()
    return unsub
  }, [])

  if (!initialized) return <FullPageSpinner />
  if (user && bootstrapComplete === false) return <FirstAdminSetup />

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      >
        <Routes location={location}>
          {/* Public / Guest routes */}
          <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Protected player routes */}
          <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/matches"      element={<ProtectedRoute><Matches /></ProtectedRoute>} />
          <Route path="/match/:id"    element={<ProtectedRoute><LiveMatch /></ProtectedRoute>} />
          <Route path="/players"      element={<ProtectedRoute><Players /></ProtectedRoute>} />
          <Route path="/player/:id"   element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin"                           element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/admin/match/new"                 element={<AdminRoute><CreateMatch /></AdminRoute>} />
          <Route path="/admin/match/:id/teams"           element={<AdminRoute><TeamBuilder /></AdminRoute>} />
          <Route path="/admin/match/:id/umpire"          element={<AdminRoute><UmpireUI /></AdminRoute>} />

          {/* Fallback */}
          <Route path="/"   element={<Navigate to="/dashboard" replace />} />
          <Route path="*"   element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
