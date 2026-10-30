import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { db } from '../firebase'
import AppLayout from '../components/Layout/AppLayout'
import Avatar from '../components/ui/Avatar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { aggregatePlayerStats, getPlayerMatchStats } from '../utils/statsHelper'
import useAuthStore from '../store/useAuthStore'

function StatBox({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-midnight-100 rounded-xl p-3 text-center border border-border">
      <p className={`font-display font-black text-2xl ${color}`}>{value}</p>
      <p className="text-white/40 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-white/25 text-[10px]">{sub}</p>}
    </div>
  )
}

export default function PlayerProfile() {
  const { id } = useParams()
  const user = useAuthStore(state => state.user)
  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState(null)
  const [matchHistory, setMatchHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Get public player profile
        const snap = await getDoc(doc(db, 'players', id))
        let playerProfile = snap.exists() ? { id: snap.id, ...snap.data() } : null
        if (!playerProfile && user?.uid === id) {
          const ownProfile = await getDoc(doc(db, 'users', id))
          if (ownProfile.exists()) playerProfile = { id: ownProfile.id, ...ownProfile.data() }
        }
        if (!playerProfile) { setLoading(false); return }
        setProfile(playerProfile)

        // Get all matches this player participated in
        const matchSnap = await getDocs(collection(db, 'matches'))
        const allMatches = matchSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const matchStats = getPlayerMatchStats(allMatches, id, true)
        setMatchHistory(matchStats)
        setStats(aggregatePlayerStats(matchStats))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.uid])

  if (loading) return (
    <AppLayout backTo="/players">
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </AppLayout>
  )

  if (!profile) return (
    <AppLayout backTo="/players">
      <div className="page-container text-center py-20 text-white/40">Player not found.</div>
    </AppLayout>
  )

  return (
    <AppLayout backTo="/players" title="Profile">
      <div className="page-container space-y-5 pt-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-midnight-300 to-midnight-200 border border-border rounded-2xl p-6 text-center overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-sapphire/5 to-transparent pointer-events-none" />
          <Avatar name={profile.name} size="xl" className="mx-auto mb-3" />
          <h1 className="font-display font-bold text-2xl text-white">{profile.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="sapphire">🏏 Player</Badge>
            <Badge variant="muted">{stats?.totalMatches || 0} matches</Badge>
          </div>
        </motion.div>

        {/* Batting Stats */}
        <section>
          <h2 className="font-display font-bold text-base text-white mb-3 flex items-center gap-2">
            🏏 Batting
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Runs"   value={stats?.batting?.runs  || 0} color="text-gold" />
            <StatBox label="HS"     value={stats?.batting?.highScore || 0} color="text-gold-bright" />
            <StatBox label="Avg"    value={stats?.batting?.average  || '-'} color="text-white" />
            <StatBox label="S/R"    value={stats?.batting?.strikeRate || '-'} color="text-sapphire-light" />
            <StatBox label="4s"     value={stats?.batting?.fours || 0} color="text-sapphire-light" />
            <StatBox label="6s"     value={stats?.batting?.sixes || 0} color="text-gold" />
          </div>
        </section>

        {/* Bowling Stats */}
        <section>
          <h2 className="font-display font-bold text-base text-white mb-3">
            🎯 Bowling
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Wickets" value={stats?.bowling?.wickets || 0} color="text-danger" />
            <StatBox label="Best"    value={stats?.bowling?.bestFigures || '-'} color="text-danger" />
            <StatBox label="Avg"     value={stats?.bowling?.average || '-'} color="text-white" />
            <StatBox label="Econ"    value={stats?.bowling?.economy || '-'} color="text-sapphire-light" />
            <StatBox label="Maidens" value={stats?.bowling?.maidens || 0} color="text-success" />
            <StatBox label="Overs"   value={stats?.bowling?.overs || 0} color="text-white" />
          </div>
        </section>

        {/* Match History */}
        {matchHistory.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-base text-white mb-3">Match History</h2>
            <div className="space-y-2">
              {matchHistory.map((mh, i) => (
                <Card key={i} animate={false} className="text-sm">
                  <p className="text-white/60 font-semibold mb-2">{mh.matchTitle}</p>
                  <div className="flex gap-4">
                    {mh.batting && (
                      <div>
                        <p className="text-white/30 text-xs mb-0.5">Batting</p>
                        <p className="text-gold font-bold">
                          {mh.batting.runs}
                          {!mh.batting.isOut && '*'}
                          <span className="text-white/30 font-normal text-xs"> ({mh.batting.balls}b)</span>
                        </p>
                      </div>
                    )}
                    {mh.bowling && mh.bowling.balls > 0 && (
                      <div>
                        <p className="text-white/30 text-xs mb-0.5">Bowling</p>
                        <p className="text-danger font-bold">
                          {mh.bowling.wickets}/{mh.bowling.runs}
                          <span className="text-white/30 font-normal text-xs">
                            {' '}({Math.floor(mh.bowling.balls/6)}.{mh.bowling.balls%6} ov)
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  {mh.batting?.dismissal && (
                    <p className="text-white/25 text-xs mt-1">{mh.batting.dismissal}</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}

