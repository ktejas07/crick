import { NavLink } from 'react-router-dom'
import { Home, Users, Trophy, Shield } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import { motion } from 'framer-motion'

const playerLinks = [
  { to: '/dashboard', icon: Home,   label: 'Home' },
  { to: '/matches',   icon: Trophy, label: 'Matches' },
  { to: '/players',   icon: Users,  label: 'Players' },
]

const adminLinks = [
  { to: '/dashboard', icon: Home,   label: 'Home' },
  { to: '/matches',   icon: Trophy, label: 'Matches' },
  { to: '/players',   icon: Users,  label: 'Players' },
  { to: '/admin',     icon: Shield, label: 'Admin' },
]

export default function BottomNav() {
  const { isAdmin } = useAuthStore()
  const links = isAdmin() ? adminLinks : playerLinks

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-bottom">
      <div className="max-w-md mx-auto">
        <div className="glass-light border-t border-border/50 flex items-center justify-around px-2 py-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-gold' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <div className={`relative ${isActive ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-gold' : ''}`}>{label}</span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

