import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Bell, LogOut, ChevronLeft, Menu } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import Avatar from '../ui/Avatar'
import { useState } from 'react'

export default function Navbar({ title, backTo }) {
  const { user, profile, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 w-full safe-top">
      <div className="max-w-md mx-auto">
        <div className="glass-light border-b border-border/50 px-4 py-3 flex items-center gap-3">
          {/* Back button */}
          {backTo && (
            <button
              onClick={() => navigate(backTo)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-midnight-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Logo / Title */}
          <div className="flex-1 flex items-center gap-2">
            {!backTo && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-bright flex items-center justify-center flex-shrink-0">
                <span className="text-midnight text-xs font-black">CA</span>
              </div>
            )}
            <span className="font-display font-bold text-base text-white truncate">
              {title || 'CricArena'}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {isAdmin() && (
              <Link
                to="/admin"
                className="p-1.5 rounded-lg text-gold/70 hover:text-gold hover:bg-midnight-300 transition-colors"
                title="Admin Panel"
              >
                <Shield size={18} />
              </Link>
            )}

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-midnight-300 transition-colors"
              >
                <Avatar name={profile?.name} size="xs" />
                <span className="text-xs text-white/60 font-medium hidden sm:block">
                  {profile?.name?.split(' ')[0]}
                </span>
              </button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-10 w-44 bg-card border border-border rounded-xl shadow-card z-50 overflow-hidden"
                >
                  <Link
                    to={`/player/${user?.uid}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-midnight-300 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Avatar name={profile?.name} size="xs" />
                    My Profile
                  </Link>
                  <hr className="border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-midnight-300 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

