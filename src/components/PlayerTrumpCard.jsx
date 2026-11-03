import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Sparkles } from 'lucide-react'

export default function PlayerTrumpCard({ player, stats, rating }) {
  const reduceMotion = useReducedMotion()
  const photoURL = player.photoURL

  return (
    <Link to={`/player/${player.id}`} className="block h-full">
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -6, rotate: -1, scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="relative isolate flex aspect-[0.7] w-full flex-col overflow-hidden rounded-[1.4rem]
                   border border-gold/35 bg-gradient-to-br from-midnight-300 via-midnight-200 to-midnight-100
                   p-3 shadow-[0_12px_35px_rgba(0,0,0,0.4)]"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.2),transparent_35%),radial-gradient(circle_at_5%_90%,rgba(59,130,246,0.2),transparent_40%)]" />
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-gold/80">
              CricArena · Player card
            </p>
            <h3 className="mt-1 truncate font-display text-lg font-bold leading-tight text-white">
              {player.name}
            </h3>
          </div>
          <div className="ml-2 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border border-gold/60 bg-midnight/80 shadow-gold">
            <span className="font-display text-lg font-black leading-none text-gold">{rating ?? '—'}</span>
            <span className="mt-0.5 text-[7px] font-bold uppercase text-white/50">Rating</span>
          </div>
        </div>

        <div className="relative my-2 min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-midnight-100">
          {photoURL ? (
            <img src={photoURL} alt={`${player.name} profile`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sapphire/40 via-midnight-300 to-gold/20">
              <span className="font-display text-6xl font-black text-white/30">
                {player.name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/95 via-midnight/10 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-white/15 bg-midnight/70 px-2 py-1 backdrop-blur">
            <Sparkles size={10} className="text-gold" />
            <span className="text-[9px] font-semibold text-white/80">{stats.totalMatches} matches</span>
          </div>
          {player.role === 'admin' && (
            <div className="absolute right-2 top-2 rounded-full border border-gold/40 bg-midnight/75 p-1.5">
              <Shield size={12} className="text-gold" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Runs', value: stats.batting.runs, color: 'text-gold' },
            { label: 'Average', value: stats.batting.average, color: 'text-gold-bright' },
            { label: 'Wickets', value: stats.bowling.wickets, color: 'text-sapphire-light' },
            { label: 'Economy', value: stats.bowling.economy, color: 'text-sapphire-light' },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-white/5 bg-midnight/45 px-2 py-1.5">
              <p className={`truncate font-display text-base font-bold leading-none ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-wider text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-[8px] text-white/30">TAP TO VIEW FULL PROFILE</p>
      </motion.article>
    </Link>
  )
}
