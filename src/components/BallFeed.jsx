import { motion, AnimatePresence } from 'framer-motion'

function BallChip({ ball }) {
  let bg = 'bg-midnight-300 text-white/70'
  let label = ball.runs === 0 ? '·' : ball.runs

  if (ball.isWicket)               { bg = 'bg-danger/80 text-white'; label = 'W' }
  else if (ball.type === 'wide')   { bg = 'bg-yellow-500/20 text-yellow-300'; label = 'Wd' }
  else if (ball.type === 'noball') { bg = 'bg-orange-500/20 text-orange-300'; label = 'NB' }
  else if (ball.runs === 4)        { bg = 'bg-sapphire/80 text-white' }
  else if (ball.runs === 6)        { bg = 'bg-gold text-midnight font-black' }

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${bg}`}
    >
      {label}
    </motion.span>
  )
}

export default function BallFeed({ innings, players = {} }) {
  if (!innings?.balls?.length) return null

  // Group by over
  const overGroups = {}
  for (const ball of innings.balls) {
    const key = ball.over
    if (!overGroups[key]) overGroups[key] = []
    overGroups[key].push(ball)
  }

  const overKeys = Object.keys(overGroups).sort((a, b) => b - a) // newest first

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Ball by Ball</h3>
      <AnimatePresence initial={false}>
        {overKeys.slice(0, 5).map(overKey => {
          const balls = overGroups[overKey]
          const bowlerUid = balls[balls.length - 1]?.bowler
          const bowlerName = players[bowlerUid]?.name || 'Bowler'
          return (
            <motion.div
              key={overKey}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-midnight-100 border border-border rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 font-semibold">Over {parseInt(overKey) + 1}</span>
                <span className="text-xs text-sapphire-light">{bowlerName}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {balls.map((b, i) => <BallChip key={i} ball={b} />)}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

