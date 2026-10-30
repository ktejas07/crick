import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import AppLayout from '../components/Layout/AppLayout'
import Avatar from '../components/ui/Avatar'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('name'))
    const unsub = onSnapshot(q, snap => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout title="Players">
      <div className="page-container space-y-4 pt-4">
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
          <div className="space-y-2">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to={`/player/${p.id}`}>
                  <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3
                                  hover:border-sapphire/40 hover:bg-midnight-300 transition-all duration-200">
                    <Avatar name={p.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate">{p.name}</p>
                        {p.role === 'admin' && (
                          <Badge variant="gold">Admin</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-white/40">
                          {p.stats?.totalMatches || 0} matches
                        </span>
                        <span className="text-xs text-gold">
                          {p.stats?.totalRuns || 0} runs
                        </span>
                        <span className="text-xs text-danger">
                          {p.stats?.totalWickets || 0} wkts
                        </span>
                      </div>
                    </div>
                    <div className="text-white/20 text-sm">›</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

