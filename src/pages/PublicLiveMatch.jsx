import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Radio, Trophy, Wifi, WifiOff } from 'lucide-react'
import { db } from '../firebase'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { economy, formatOvers, strikeRate } from '../utils/cricketEngine'

function getEvent(ball) {
  if (ball.isWicket) return { title: 'WICKET!', subtitle: ball.wicketType || 'OUT', color: 'text-danger', symbol: '🏏' }
  if (ball.type === 'wide') return { title: 'WIDE!', subtitle: `+${ball.totalRuns || 1} extra runs`, color: 'text-yellow-300', symbol: '↗' }
  if (ball.type === 'noball') return { title: 'NO BALL!', subtitle: `+${ball.totalRuns || 1} run`, color: 'text-orange-300', symbol: '⚠' }
  if (ball.type === 'normal' && ball.runs === 6) return { title: 'SIX!', subtitle: 'That is out of the park!', color: 'text-gold', symbol: '🏏' }
  if (ball.type === 'normal' && ball.runs === 4) return { title: 'FOUR!', subtitle: 'Cracked to the boundary!', color: 'text-sapphire-light', symbol: '🏏' }
  if (ball.runs > 0) return { title: `${ball.runs} RUN${ball.runs === 1 ? '' : 'S'}`, subtitle: 'Score updated', color: 'text-white', symbol: '●' }
  return { title: 'DOT BALL', subtitle: 'Great delivery!', color: 'text-white/75', symbol: '•' }
}

function ScoreTile({ team, innings, isBatting }) {
  const score = innings
    ? `${innings.runs || 0}/${innings.wickets || 0}`
    : 'Yet to bat'

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${
      isBatting ? 'border-gold/40 bg-gradient-to-br from-gold/15 to-midnight-200' : 'border-border bg-midnight-200/80'
    }`}>
      {isBatting && <div className="live-dot absolute right-3 top-3" />}
      <p className="truncate pr-4 text-sm font-bold text-white">{team?.name || 'Team'}</p>
      <p className="mt-2 font-display text-4xl font-black leading-none text-white">{score}</p>
      {innings && (
        <p className="mt-2 text-xs text-white/50">
          {formatOvers(innings.oversCompleted || 0, innings.ballsInCurrentOver || 0)} overs
          {' · '}RR {((innings.runs || 0) / Math.max(1, ((innings.oversCompleted || 0) * 6 + (innings.ballsInCurrentOver || 0))) * 6).toFixed(2)}
        </p>
      )}
    </div>
  )
}

function PlayerStats({ innings, match, battingTeamKey, players }) {
  if (!innings) return null
  const battingTeam = match[battingTeamKey]
  const bowlingTeamKey = innings.bowlingTeam || (battingTeamKey === 'teamA' ? 'teamB' : 'teamA')
  const bowlingTeam = match[bowlingTeamKey]
  const batterIds = [...new Set([...(battingTeam?.playerIds || []), ...Object.keys(innings.batting || {})])]
  const bowlerIds = [...new Set([...(bowlingTeam?.playerIds || []), ...Object.keys(innings.bowling || {})])]
  const nameOf = uid => battingTeam?.playerNames?.[uid] || bowlingTeam?.playerNames?.[uid] || players[uid]?.name || 'Player'

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-midnight-200/80">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Batting</p>
            <h3 className="font-display font-bold text-white">{battingTeam?.name || 'Batting team'}</h3>
          </div>
          <p className="font-display text-xl font-black text-white">{innings.runs || 0}/{innings.wickets || 0}</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_36px_36px_40px_38px] gap-1 bg-midnight-100/70 px-4 py-2 text-right text-[9px] font-bold uppercase text-white/35">
          <span className="text-left">Batter</span><span>R</span><span>B</span><span>4s/6s</span><span>SR</span>
        </div>
        {batterIds.map(uid => {
          const stats = innings.batting?.[uid]
          return (
            <div key={uid} className="grid grid-cols-[minmax(0,1fr)_36px_36px_40px_38px] gap-1 border-t border-border/40 px-4 py-2.5 text-right text-xs">
              <span className="flex min-w-0 items-center gap-1 text-left font-medium text-white">
                <span className="truncate">{nameOf(uid)}</span>
                {uid === innings.striker && (
                  <span className="shrink-0 text-sm text-gold" role="img" aria-label="On strike" title="On strike">🏏</span>
                )}
              </span>
              <span className="font-bold text-white">{stats?.runs ?? '—'}</span>
              <span className="text-white/55">{stats?.balls ?? '—'}</span>
              <span className="text-white/55">{stats ? `${stats.fours || 0}/${stats.sixes || 0}` : '—'}</span>
              <span className="text-white/55">{stats?.balls ? strikeRate(stats.runs || 0, stats.balls) : '—'}</span>
            </div>
          )
        })}
        <div className="flex items-start justify-between border-t border-border/50 px-4 py-2 text-xs">
          <span className="text-white/45">Extras</span>
          <span className="text-right text-white/70">
            {innings.extras?.total || 0}
            {' '} (b {innings.extras?.byes || 0}, lb {innings.extras?.legByes || 0}, w {innings.extras?.wides || 0}, nb {innings.extras?.noBalls || 0})
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-midnight-200/80">
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sapphire-light">Bowling</p>
          <h3 className="font-display font-bold text-white">{bowlingTeam?.name || 'Bowling team'}</h3>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_46px_34px_34px_42px] gap-1 bg-midnight-100/70 px-4 py-2 text-right text-[9px] font-bold uppercase text-white/35">
          <span className="text-left">Bowler</span><span>O</span><span>R</span><span>W</span><span>ECON</span>
        </div>
        {bowlerIds.map(uid => {
          const stats = innings.bowling?.[uid]
          const balls = stats?.balls || 0
          return (
            <div key={uid} className="grid grid-cols-[minmax(0,1fr)_46px_34px_34px_42px] gap-1 border-t border-border/40 px-4 py-2.5 text-right text-xs">
              <span className="truncate text-left font-medium text-white">{nameOf(uid)}</span>
              <span className="text-white/60">{formatOvers(Math.floor(balls / 6), balls % 6)}</span>
              <span className="text-white/60">{stats?.runs || 0}</span>
              <span className="font-bold text-white">{stats?.wickets || 0}</span>
              <span className="text-white/60">{balls ? economy(stats?.runs || 0, balls) : '—'}</span>
            </div>
          )
        })}
      </section>
    </div>
  )
}

function CurrentOver({ innings, names }) {
  if (!innings?.balls?.length) return null
  const currentOver = innings.balls[innings.balls.length - 1].over ?? innings.oversCompleted ?? 0
  const balls = innings.balls.filter(ball => ball.over === currentOver)
  const latest = balls[balls.length - 1]

  return (
    <section className="rounded-2xl border border-border bg-midnight-200/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-white">Over {currentOver + 1}</h3>
        <span className="text-xs text-white/45">Bowler · {names[latest?.bowler] || '—'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {balls.length ? balls.map((ball, index) => {
          const label = ball.isWicket ? 'W'
            : ball.type === 'wide' ? `Wd${ball.runs ? `+${ball.runs}` : ''}`
              : ball.type === 'noball' ? `NB${ball.runs ? `+${ball.runs}` : ''}`
                : ball.type === 'bye' ? `B${ball.runs || ''}`
                  : ball.type === 'legbye' ? `LB${ball.runs || ''}`
                    : ball.runs
          const color = ball.isWicket ? 'bg-danger text-white'
            : ball.runs === 6 ? 'bg-gold text-midnight'
              : ball.runs === 4 ? 'bg-sapphire text-white'
                : ball.type === 'wide' ? 'bg-yellow-500/20 text-yellow-200'
                  : ball.type === 'noball' ? 'bg-orange-500/20 text-orange-200'
                    : 'bg-midnight-300 text-white/80'
          return (
            <motion.div
              key={`${ball.id || ball.timestamp || index}`}
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-xs font-black ${color}`}
            >
              {label}
            </motion.div>
          )
        }) : <span className="text-xs text-white/35">Waiting for first ball…</span>}
      </div>
    </section>
  )
}

function EventCelebration({ event, onDismiss }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!event) return undefined
    const timer = window.setTimeout(onDismiss, 2400)
    return () => window.clearTimeout(timer)
  }, [event, onDismiss])

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-midnight/60 backdrop-blur-[2px]"
        >
          {!reduceMotion && Array.from({ length: 14 }, (_, index) => (
            <motion.span
              key={index}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.3 }}
              animate={{
                x: Math.cos(index * Math.PI / 7) * (100 + index * 6),
                y: Math.sin(index * Math.PI / 7) * (90 + index * 5),
                opacity: 0,
                scale: 1.4,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`absolute h-2.5 w-2.5 rounded-sm ${event.color.includes('gold') ? 'bg-gold' : event.color.includes('danger') ? 'bg-danger' : 'bg-sapphire-light'}`}
            />
          ))}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.5, y: 24, rotate: -6 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={reduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
            className="rounded-3xl border border-white/15 bg-midnight-200/95 px-10 py-8 text-center shadow-[0_0_70px_rgba(245,158,11,0.2)]"
          >
            <motion.div
              animate={reduceMotion ? undefined : { rotate: [0, -18, 18, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.65 }}
              className="mb-2 text-5xl"
            >
              {event.symbol}
            </motion.div>
            <p className={`font-display text-5xl font-black ${event.color}`}>{event.title}</p>
            <p className="mt-1 text-sm text-white/65">{event.subtitle}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function PublicLiveMatch() {
  const { code: routeCode = '' } = useParams()
  const code = routeCode.toUpperCase()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [event, setEvent] = useState(null)
  const [connection, setConnection] = useState(true)
  const lastBallRef = useRef(null)
  const eventSequence = useRef(0)

  useEffect(() => {
    setLoading(true)
    setMatch(null)
    setError('')
    lastBallRef.current = null
    if (!/^[A-HJ-NP-Z2-9]{12}$/.test(code)) {
      setError('That match code is not valid.')
      setLoading(false)
      return undefined
    }

    return onSnapshot(doc(db, 'publicMatches', code), snapshot => {
      setConnection(true)
      if (!snapshot.exists()) {
        setError('No shared match was found for this code.')
        setMatch(null)
        setLoading(false)
        return
      }

      const data = snapshot.data()
      const currentIndex = data.status === 'innings2' || data.status === 'completed' && data.innings?.length > 1 ? 1 : 0
      const balls = data.innings?.[currentIndex]?.balls || []
      const lastBall = balls[balls.length - 1]
      const signature = lastBall ? `${currentIndex}:${JSON.stringify(lastBall)}` : null
      const previous = lastBallRef.current
      if (previous && signature && previous.signature !== signature && balls.length > previous.count) {
        const newEvent = getEvent(lastBall)
        eventSequence.current += 1
        setEvent({ ...newEvent, key: eventSequence.current })
      }
      lastBallRef.current = { signature, count: balls.length }
      setMatch(data)
      setLoading(false)
    }, snapshotError => {
      console.error('Could not load shared match score', snapshotError)
      setError('Could not load this shared match. Check the code or try again later.')
      setConnection(false)
      setLoading(false)
    })
  }, [code])

  if (loading) {
    return <main className="min-h-screen bg-twilight px-5 pt-24"><div className="flex justify-center"><Spinner size="lg" /></div></main>
  }

  const currentIndex = match
    ? match.status === 'innings2' || match.status === 'completed' && match.innings?.length > 1 ? 1 : 0
    : 0
  const innings = match?.innings?.[currentIndex]
  const currentTeamKey = innings?.battingTeam
  const teams = [
    { key: 'teamA', team: match?.teamA, innings: match?.innings?.find(item => item.battingTeam === 'teamA'), batting: currentTeamKey === 'teamA' },
    { key: 'teamB', team: match?.teamB, innings: match?.innings?.find(item => item.battingTeam === 'teamB'), batting: currentTeamKey === 'teamB' },
  ]
  const playerNames = { ...(match?.teamA?.playerNames || {}), ...(match?.teamB?.playerNames || {}) }
  const clearEvent = () => setEvent(null)

  return (
    <main className="min-h-screen overflow-hidden bg-twilight text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(59,130,246,0.14),transparent_35%),radial-gradient(ellipse_at_95%_20%,rgba(245,158,11,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-2xl px-4 pb-12 pt-5 sm:px-6">
        <header className="mb-5 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-xs font-semibold text-white/45 hover:text-white">
            <ArrowLeft size={15} /> CricArena
          </Link>
          <div className="flex items-center gap-2">
            {connection ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-danger" />}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {connection ? 'Live score' : 'Reconnecting'}
            </span>
          </div>
        </header>

        {error ? (
          <div className="mt-16 rounded-3xl border border-border bg-card p-7 text-center shadow-card">
            <Radio size={30} className="mx-auto mb-3 text-gold" />
            <h1 className="font-display text-2xl font-bold text-white">Can’t find that match</h1>
            <p className="mt-2 text-sm text-white/45">{error}</p>
            <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-gold">Enter another code</Link>
          </div>
        ) : match && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-gold/25 bg-gradient-to-br from-midnight-300/95 via-midnight-200/95 to-midnight-100/95 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.35)] sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/75">CricArena · Live Match Centre</p>
                  <h1 className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">{match.title}</h1>
                  <p className="mt-1 text-xs text-white/40">{match.venue} · {match.overs} overs</p>
                </div>
                <Badge variant={match.status === 'completed' ? 'sapphire' : 'live'}>
                  {match.status === 'completed' ? 'FULL TIME' : match.status?.startsWith('innings') ? 'LIVE' : 'UPCOMING'}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {teams.map(({ key, team, innings: teamInnings, batting }) => (
                  <ScoreTile key={key} team={team} innings={teamInnings} isBatting={batting && match.status !== 'completed'} />
                ))}
              </div>

              {match.status === 'innings2' && match.innings?.[0] && innings && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-midnight/35 px-3 py-2 text-xs">
                  <span className="text-white/55">
                    Target {match.innings[0].runs + 1} · {Math.max(0, match.innings[0].runs + 1 - innings.runs)} needed
                  </span>
                  <span className="font-semibold text-gold">
                    {Math.max(0, ((match.overs || 0) - (innings.oversCompleted || 0)) * 6 - (innings.ballsInCurrentOver || 0))} balls left
                  </span>
                </div>
              )}
              {match.result && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/10 px-3 py-2.5">
                  <Trophy size={15} className="text-gold" />
                  <p className="text-center text-sm font-bold text-gold">{match.result}</p>
                </div>
              )}
            </div>

            {innings ? (
              <>
                <CurrentOver innings={innings} names={playerNames} />
                <PlayerStats innings={innings} match={match} battingTeamKey={currentTeamKey} players={{}} />
                {match.innings?.length > 1 && (
                  <details className="rounded-2xl border border-border bg-midnight-200/55 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-white/70">
                      Previous innings · {match.innings[currentIndex === 1 ? 0 : 1]?.runs ?? 0} runs
                    </summary>
                    <div className="mt-4">
                      <PlayerStats
                        innings={match.innings[currentIndex === 1 ? 0 : 1]}
                        match={match}
                        battingTeamKey={match.innings[currentIndex === 1 ? 0 : 1]?.battingTeam}
                        players={{}}
                      />
                    </div>
                  </details>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-white/45">
                The match dashboard will update here as soon as the toss is completed.
              </div>
            )}

            <p className="pt-2 text-center text-[10px] text-white/25">Watching with code {code} · No account required</p>
          </div>
        )}
      </div>
      <EventCelebration event={event} onDismiss={clearEvent} />
    </main>
  )
}
