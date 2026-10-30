import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Calendar, Trophy, Bell, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import useAuthStore from '../store/useAuthStore'
import AppLayout from '../components/Layout/AppLayout'
import MatchCard from '../components/MatchCard'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { aggregatePlayerStats, getPlayerMatchStats } from '../utils/statsHelper'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)

  // Real-time matches listener
  useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMatches(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const liveMatches  = matches.filter(m => m.status === 'innings1' || m.status === 'innings2')
  const upcomingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'toss')
  const pastMatches  = matches.filter(m => m.status === 'completed')

  // My matches (player is in teamA or teamB)
  const myMatches = matches.filter(m =>
    m.teamA?.playerIds?.includes(user?.uid) ||
    m.teamB?.playerIds?.includes(user?.uid)
  )
  const myStats = user?.uid
    ? aggregatePlayerStats(getPlayerMatchStats(matches, user.uid))
    : null

  // Unread notifications
  const unread = (profile?.notifications || []).filter(n => !n.read).length

  return (
    <AppLayout>
      <div className="page-container space-y-6 pt-4">

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <p className="text-white/40 text-sm">Welcome back,</p>
            <h1 className="font-display font-bold text-2xl text-white">
              {profile?.name?.split(' ')[0] || 'Player'} 👋
            </h1>
          </div>
          {unread > 0 && (
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center border border-gold/30">
                <Bell size={16} className="text-gold" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {unread}
              </span>
            </div>
          )}
        </motion.div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="live-dot" />
              <h2 className="font-display font-bold text-base text-white">Live Now</h2>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {liveMatches.map(match => (
                  <motion.div key={match.id} layout>
                    <MatchCard match={match} id={match.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* My Matches */}
        {myMatches.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-base text-white">My Matches</h2>
              <Link to="/matches" className="text-xs text-sapphire-light flex items-center gap-0.5">
                All <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {myMatches.slice(0, 3).map(match => (
                <MatchCard key={match.id} match={match} id={match.id} />
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section>
          <h2 className="font-display font-bold text-base text-white mb-3">My Stats</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Matches',  value: myStats?.totalMatches || 0, color: 'text-sapphire-light' },
              { label: 'Runs',     value: myStats?.batting?.runs || 0, color: 'text-gold' },
              { label: 'Wickets',  value: myStats?.bowling?.wickets || 0, color: 'text-danger' },
            ].map(stat => (
              <Card key={stat.label} className="text-center py-3 px-2" animate={false}>
                <p className={`font-display font-black text-2xl ${stat.color}`}>{stat.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{stat.label}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming */}
        {upcomingMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-gold" />
              <h2 className="font-display font-bold text-base text-white">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {upcomingMatches.slice(0, 3).map(m => (
                <MatchCard key={m.id} match={m} id={m.id} />
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {/* Empty */}
        {!loading && matches.length === 0 && (
          <div className="text-center py-12">
            <Trophy size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No matches yet.</p>
            <p className="text-white/25 text-xs mt-1">An admin will create one soon!</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

