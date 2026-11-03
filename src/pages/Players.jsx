import { useEffect, useMemo, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search, Users, Sparkles, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import AppLayout from '../components/Layout/AppLayout'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { aggregatePlayerStats, getPlayerMatchStats } from '../utils/statsHelper'
import { getPlayerRating } from '../utils/playerRating'
import PlayerTrumpCard from '../components/PlayerTrumpCard'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [search, setSearch]   = useState('')
  const [view, setView] = useState('list')
  const [playersLoaded, setPlayersLoaded] = useState(false)
  const [matchesLoaded, setMatchesLoaded] = useState(false)
  const reduceMotion = useReducedMotion()
  const loading = !playersLoaded || !matchesLoaded

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('name'))
    const unsub = onSnapshot(q, snap => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPlayersLoaded(true)
    })
    const unsubscribeMatches = onSnapshot(collection(db, 'matches'), snap => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setMatchesLoaded(true)
    })
    return () => { unsub(); unsubscribeMatches() }
  }, [])

  const playerCards = useMemo(() => players.map(player => {
    const stats = aggregatePlayerStats(getPlayerMatchStats(matches, player.id))
    return { player, stats, rating: getPlayerRating(stats) }
  }), [players, matches])

  const filtered = playerCards.filter(({ player }) =>
    player.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout title="Players">
      <div className="page-container space-y-4 pt-4">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-sapphire/20 bg-gradient-to-br from-sapphire/10 via-midnight-200/70 to-gold/5 p-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            <h1 className="font-display text-xl font-bold text-white">Player Arena</h1>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Explore player stats and collectible-style performance cards.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-midnight-100 p-1">
          {[
            { key: 'list', label: 'Players', Icon: Users },
            { key: 'cards', label: 'Player Cards', Icon: CreditCard },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                view === key ? 'text-midnight' : 'text-white/50 hover:text-white'
              }`}
            >
              {view === key && (
                <motion.span
                  layoutId="player-view-tab"
                  className="absolute inset-0 rounded-lg bg-gold"
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              )}
              <span className="relative flex items-center gap-2"><Icon size={15} />{label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-midnight-100 border border-border rounded-xl px-4 py-3 pl-9 text-white
                       placeholder-white/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30
                       transition-all duration-200 text-sm"
          />
        </div>

        {/* Count */}
        <p className="text-white/30 text-xs">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</p>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={36} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No players found.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {view === 'cards' ? (
              <motion.section
                key="cards"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-white">Player Card Collection</h2>
                  <Sparkles size={16} className="text-gold" />
                </div>
                <p className="text-[10px] leading-relaxed text-white/35">
                  Rating balances batting average and strike rate with wickets per bowling innings and economy.
                  Each metric is benchmarked and capped at 10; batting and bowling are weighted equally when available.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map(({ player, stats, rating }, index) => (
                    <motion.div
                      key={player.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28) }}
                    >
                      <PlayerTrumpCard player={player} stats={stats} rating={rating} />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ) : (
              <motion.div
                key="list"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                className="space-y-2"
              >
                {filtered.map(({ player, stats, rating }, i) => (
                  <motion.div
                    key={player.id}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : Math.min(i * 0.025, 0.2) }}
                  >
                    <Link to={`/player/${player.id}`}>
                      <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-sapphire/50 hover:bg-midnight-300">
                        <Avatar name={player.name} photoURL={player.photoURL} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-white">{player.name}</p>
                            {player.role === 'admin' && <Badge variant="gold">Admin</Badge>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3">
                            <span className="text-xs text-white/40">{stats.totalMatches} matches</span>
                            <span className="text-xs text-gold">{stats.batting.runs} runs</span>
                            <span className="text-xs text-danger">{stats.bowling.wickets} wkts</span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-gold/20 bg-gold/5 px-2 py-1 text-right">
                          <p className="font-display text-sm font-bold text-gold">{rating ?? '—'}</p>
                          <p className="text-[8px] uppercase tracking-wide text-white/35">Rating</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  )
}
