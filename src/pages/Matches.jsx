import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Trophy, Filter } from 'lucide-react'
import { db } from '../firebase'
import AppLayout from '../components/Layout/AppLayout'
import MatchCard from '../components/MatchCard'
import Spinner from '../components/ui/Spinner'

const FILTERS = ['All', 'Live', 'Upcoming', 'Completed']

export default function Matches() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  const filtered = matches.filter(m => {
    if (filter === 'All')       return true
    if (filter === 'Live')      return m.status === 'innings1' || m.status === 'innings2'
    if (filter === 'Upcoming')  return m.status === 'scheduled' || m.status === 'toss'
    if (filter === 'Completed') return m.status === 'completed'
    return true
  })

  return (
    <AppLayout title="Matches">
      <div className="page-container space-y-4 pt-4">
        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                filter === f
                  ? 'bg-gold text-midnight shadow-gold'
                  : 'bg-midnight-200 text-white/50 border border-border hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Trophy size={36} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No {filter.toLowerCase()} matches.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <MatchCard match={m} id={m.id} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

