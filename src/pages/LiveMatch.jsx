import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Play, Shield } from 'lucide-react'
import { db } from '../firebase'
import useAuthStore from '../store/useAuthStore'
import AppLayout from '../components/Layout/AppLayout'
import Scoreboard from '../components/Scoreboard'
import BallFeed from '../components/BallFeed'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { formatOvers, strikeRate, economy } from '../utils/cricketEngine'

export default function LiveMatch() {
  const { id } = useParams()
  const { profile, isAdmin } = useAuthStore()
  const [match, setMatch]   = useState(null)
  const [players, setPlayers] = useState({})
  const [loading, setLoading] = useState(true)

  // Real-time match listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'matches', id), (snap) => {
      if (snap.exists()) setMatch({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
    return unsub
  }, [id])

  if (loading) return (
    <AppLayout backTo="/matches">
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </AppLayout>
  )

  if (!match) return (
    <AppLayout backTo="/matches">
      <div className="page-container text-center py-20 text-white/40">Match not found.</div>
    </AppLayout>
  )

  const isLive = match.status === 'innings1' || match.status === 'innings2'
  const inningsIdx = match.status === 'innings2' ? 1 : 0
  const currentInnings = match.innings?.[inningsIdx]

  const getPlayerName = (uid) => players[uid]?.name || uid?.slice(0, 8) || '—'

  return (
    <AppLayout title={match.title} backTo="/matches">
      <div className="page-container space-y-4 pt-4">

        {/* Status + Admin link */}
        <div className="flex items-center justify-between">
          <Badge variant={isLive ? 'live' : match.status === 'completed' ? 'sapphire' : 'muted'}>
            {isLive && <span className="live-dot" />}
            {isLive ? 'LIVE' : match.status?.toUpperCase()}
          </Badge>
          {isAdmin() && (isLive || match.status === 'toss') && (
            <Link to={`/admin/match/${id}/umpire`}>
              <Button size="sm" variant="outline">
                <Shield size={14} /> Open Umpire
              </Button>
            </Link>
          )}
        </div>

        {/* Match info */}
        <div className="text-center">
          <h2 className="font-display font-bold text-xl text-white">{match.title}</h2>
          <p className="text-white/40 text-sm">{match.venue} · {match.overs} overs</p>
        </div>

        {/* Teams banner */}
        <div className="flex items-center justify-between bg-midnight-200 rounded-2xl p-4 border border-border">
          <div className="text-center flex-1">
            <div className="w-10 h-10 rounded-xl bg-sapphire/20 flex items-center justify-center mx-auto mb-1">
              <span className="text-sapphire-light font-bold text-sm">A</span>
            </div>
            <p className="font-display font-bold text-white text-sm">{match.teamA?.name}</p>
            <p className="text-white/30 text-xs">{match.teamA?.playerIds?.length || 0} players</p>
          </div>
          <div className="px-4">
            <span className="text-white/30 font-bold text-sm">VS</span>
          </div>
          <div className="text-center flex-1">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center mx-auto mb-1">
              <span className="text-gold font-bold text-sm">B</span>
            </div>
            <p className="font-display font-bold text-white text-sm">{match.teamB?.name}</p>
            <p className="text-white/30 text-xs">{match.teamB?.playerIds?.length || 0} players</p>
          </div>
        </div>

        {/* Toss result */}
        {match.toss && (
          <p className="text-center text-xs text-white/40">
            {match.toss.winner === 'teamA' ? match.teamA?.name : match.teamB?.name} won the toss and chose to{' '}
            <span className="text-gold font-semibold">{match.toss.choice}</span>
          </p>
        )}

        {/* Live Scoreboard */}
        {currentInnings && (
          <Scoreboard match={match} inningsIndex={inningsIdx} />
        )}

        {/* Second innings summary (if in innings2) */}
        {match.status === 'innings2' && match.innings?.[0] && (
          <Card animate={false} className="text-sm">
            <p className="text-white/40 text-xs mb-1">1st Innings</p>
            <div className="flex justify-between">
              <span className="text-white font-semibold">
                {match.innings[0].battingTeam === 'teamA' ? match.teamA?.name : match.teamB?.name}
              </span>
              <span className="font-display font-bold text-white">
                {match.innings[0].runs}/{match.innings[0].wickets}
                <span className="text-white/40 text-xs ml-1">
                  ({formatOvers(match.innings[0].oversCompleted, match.innings[0].ballsInCurrentOver)})
                </span>
              </span>
            </div>
          </Card>
        )}

        {/* Current Players at Crease */}
        {currentInnings && isLive && (
          <Card animate={false}>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">At the Crease</p>
            <div className="space-y-2">
              {[currentInnings.striker, currentInnings.nonStriker].map((uid, i) => {
                const bat = currentInnings.batting?.[uid]
                return uid ? (
                  <Link key={uid} to={`/player/${uid}`}>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={getPlayerName(uid)} size="xs" />
                        <div>
                          <p className="text-sm text-white font-medium">
                            {getPlayerName(uid)}
                            {i === 0 && <span className="text-gold text-xs ml-1">*</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-white text-sm">
                          {bat?.runs ?? 0}
                          <span className="text-white/40 text-xs"> ({bat?.balls ?? 0})</span>
                        </p>
                        <p className="text-white/30 text-xs">
                          SR: {strikeRate(bat?.runs ?? 0, bat?.balls ?? 1)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : null
              })}
            </div>
          </Card>
        )}

        {/* Bowling */}
        {currentInnings?.currentBowler && isLive && (
          <Card animate={false}>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Bowling</p>
            {(() => {
              const uid = currentInnings.currentBowler
              const bwl = currentInnings.bowling?.[uid]
              return (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={getPlayerName(uid)} size="xs" />
                    <p className="text-sm text-white font-medium">{getPlayerName(uid)}</p>
                  </div>
                  <p className="font-display font-bold text-white text-sm">
                    {bwl?.wickets ?? 0}/{bwl?.runs ?? 0}
                    <span className="text-white/40 text-xs ml-1">
                      ({Math.floor((bwl?.balls ?? 0) / 6)}.{(bwl?.balls ?? 0) % 6})
                    </span>
                  </p>
                </div>
              )
            })()}
          </Card>
        )}

        {/* Ball feed */}
        {currentInnings && (
          <BallFeed innings={currentInnings} players={players} />
        )}

        {/* Result */}
        {match.result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/40 rounded-2xl p-5 text-center"
          >
            <p className="text-gold font-display font-bold text-xl">🏆 Match Result</p>
            <p className="text-white font-semibold mt-1">{match.result}</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}

