import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentOverBalls } from '../utils/cricketEngine'

const BallIndicator = ({ ball }) => {
  if (!ball) return <div className="ball-dot ball-dot-empty" />

  let cls = 'ball-dot-normal'
  let label = ball.runs ?? '·'

  if (ball.isWicket)                     { cls = 'ball-dot-wicket'; label = 'W' }
  else if (ball.type === 'wide')         { cls = 'ball-dot-wide';   label = 'Wd' }
  else if (ball.type === 'noball')       { cls = 'ball-dot-noball'; label = 'NB' }
  else if (ball.runs === 4)              { cls = 'ball-dot-four' }
  else if (ball.runs === 6)              { cls = 'ball-dot-six' }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`ball-dot ${cls}`}
    >
      {label}
    </motion.div>
  )
}

export default function Scoreboard({ match, inningsIndex = 0 }) {
  if (!match) return null

  const innings = match.innings?.[inningsIndex]
  if (!innings) return null

  const currentBalls = getCurrentOverBalls(innings)
  // Pad to 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => currentBalls[i] || null)

  const overs = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`
  const teamName = innings.battingTeam === 'teamA' ? match.teamA?.name : match.teamB?.name

  // Second innings target
  const isSecondInnings = inningsIndex === 1
  const target = isSecondInnings ? (match.innings?.[0]?.runs || 0) + 1 : null
  const needed = target ? target - innings.runs : null

  return (
    <div className="bg-gradient-to-br from-midnight-300 to-midnight-200 border border-border rounded-2xl p-4 space-y-3">
      {/* Team name + status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">
            {isSecondInnings ? 'Chasing' : 'Batting'}
          </p>
          <h2 className="font-display font-bold text-lg text-white">{teamName}</h2>
        </div>
        {isSecondInnings && target && (
          <div className="text-right">
            <p className="text-xs text-white/50">Target</p>
            <p className="font-display font-bold text-gold text-lg">{target}</p>
          </div>
        )}
      </div>

      {/* Big score */}
      <div className="flex items-end gap-3">
        <div>
          <motion.div
            key={`${innings.runs}-${innings.wickets}`}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.3 }}
            className="font-display font-black text-5xl text-white leading-none"
          >
            {innings.runs}
            <span className="text-white/40 text-3xl">/{innings.wickets}</span>
          </motion.div>
          <p className="text-white/50 text-sm mt-1">Overs: {overs}</p>
        </div>

        {isSecondInnings && needed !== null && needed > 0 && (
          <div className="ml-auto text-right pb-1">
            <p className="text-gold font-display font-bold text-xl">{needed} needed</p>
            <p className="text-white/40 text-xs">
              {(match.overs - innings.oversCompleted) * 6 - innings.ballsInCurrentOver} balls left
            </p>
          </div>
        )}
        {isSecondInnings && needed !== null && needed <= 0 && (
          <div className="ml-auto">
            <span className="text-success font-bold">Won! 🎉</span>
          </div>
        )}
      </div>

      {/* Current over balls */}
      <div>
        <p className="text-white/40 text-xs mb-2">This over</p>
        <div className="flex gap-1.5">
          {slots.map((ball, i) => (
            <BallIndicator key={i} ball={ball} />
          ))}
        </div>
      </div>
    </div>
  )
}

