import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Clock, Play, CheckCircle } from 'lucide-react'
import Badge from './ui/Badge'

const statusConfig = {
  scheduled: { label: 'Scheduled', variant: 'muted',   icon: Clock,        color: 'text-white/50' },
  toss:      { label: 'Toss',      variant: 'gold',    icon: Trophy,       color: 'text-gold' },
  innings1:  { label: 'Live',      variant: 'live',    icon: Play,         color: 'text-success' },
  innings2:  { label: 'Live',      variant: 'live',    icon: Play,         color: 'text-success' },
  completed: { label: 'Completed', variant: 'sapphire',icon: CheckCircle,  color: 'text-sapphire-light' },
}

export default function MatchCard({ match, id }) {
  const cfg = statusConfig[match.status] || statusConfig.scheduled
  const Icon = cfg.icon

  const isLive = match.status === 'innings1' || match.status === 'innings2'
  const inningsIdx = match.status === 'innings2' ? 1 : 0
  const inn = match.innings?.[inningsIdx]

  return (
    <Link to={`/match/${id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={`relative bg-card border rounded-2xl p-4 overflow-hidden transition-all duration-200
          hover:border-sapphire/40 ${isLive ? 'border-success/40 shadow-[0_0_20px_rgba(52,211,153,0.1)]' : 'border-border'}`}
      >
        {/* Live pulse background */}
        {isLive && (
          <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent pointer-events-none" />
        )}

        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-white text-base leading-tight">{match.title}</h3>
            <p className="text-xs text-white/40 mt-0.5">{match.venue} · {match.overs} overs</p>
          </div>
          <Badge variant={cfg.variant}>
            {isLive && <span className="live-dot" />}
            {cfg.label}
          </Badge>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sapphire/20 flex items-center justify-center">
              <span className="text-xs font-bold text-sapphire-light">A</span>
            </div>
            <span className="text-sm font-semibold text-white">{match.teamA?.name || 'Team A'}</span>
          </div>

          <span className="text-white/30 text-xs font-bold">VS</span>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{match.teamB?.name || 'Team B'}</span>
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <span className="text-xs font-bold text-gold">B</span>
            </div>
          </div>
        </div>

        {/* Live score preview */}
        {inn && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={12} className={cfg.color} />
              <span className="text-xs text-white/50">
                {inn.battingTeam === 'teamA' ? match.teamA?.name : match.teamB?.name}
              </span>
            </div>
            <span className="font-display font-bold text-white text-sm">
              {inn.runs}/{inn.wickets}
              <span className="text-white/40 text-xs ml-1">({inn.oversCompleted}.{inn.ballsInCurrentOver})</span>
            </span>
          </div>
        )}

        {/* Result */}
        {match.result && (
          <p className="mt-2 text-xs text-gold font-semibold">{match.result}</p>
        )}
      </motion.div>
    </Link>
  )
}

