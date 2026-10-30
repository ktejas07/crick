import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { Plus, Trash2, Shield, Users, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { db } from '../../firebase'
import AppLayout from '../../components/Layout/AppLayout'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'

export default function AdminPanel() {
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('matches') // 'matches' | 'players'

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'matches'), orderBy('createdAt', 'desc')),
      snap => { setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) }
    )
    const unsub2 = onSnapshot(
      query(collection(db, 'users'), orderBy('name')),
      snap => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    return () => { unsub1(); unsub2() }
  }, [])

  const deleteMatch = async (id) => {
    if (!window.confirm('Delete this match? This cannot be undone.')) return
    try {
      await deleteDoc(doc(db, 'matches', id))
      toast.success('Match deleted')
    } catch { toast.error('Failed to delete match') }
  }

  return (
    <AppLayout title="Admin Panel">
      <div className="page-container space-y-4 pt-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-gold" />
          <h1 className="font-display font-bold text-xl text-white">Admin Panel</h1>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2">
          {[
            { key: 'matches', label: 'Matches', icon: Trophy },
            { key: 'players', label: 'Players', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                tab === key
                  ? 'bg-gold text-midnight shadow-gold'
                  : 'bg-midnight-200 text-white/50 border border-border hover:text-white'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── MATCHES TAB ── */}
        {tab === 'matches' && (
          <div className="space-y-3">
            <Link to="/admin/match/new">
              <Button fullWidth variant="primary" size="lg">
                <Plus size={18} /> Create New Match
              </Button>
            </Link>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : matches.length === 0 ? (
              <p className="text-center text-white/40 py-8">No matches yet.</p>
            ) : (
              matches.map(m => (
                <Card key={m.id} animate={false} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-white">{m.title}</h3>
                      <p className="text-xs text-white/40">{m.venue} · {m.overs} overs</p>
                    </div>
                    <Badge variant={
                      m.status === 'innings1' || m.status === 'innings2' ? 'live' :
                      m.status === 'completed' ? 'sapphire' : 'muted'
                    }>
                      {m.status?.replace('innings1', 'LIVE').replace('innings2', 'LIVE')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{m.teamA?.name} vs {m.teamB?.name}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {(m.status === 'scheduled' || m.status === 'toss') && (
                      <>
                        <Link to={`/admin/match/${m.id}/teams`} className="flex-1">
                          <Button size="sm" variant="secondary" fullWidth>Teams</Button>
                        </Link>
                        <Link to={`/admin/match/${m.id}/umpire`} className="flex-1">
                          <Button size="sm" variant="sapphire" fullWidth>
                            <Shield size={13} /> Umpire
                          </Button>
                        </Link>
                      </>
                    )}
                    {(m.status === 'innings1' || m.status === 'innings2') && (
                      <Link to={`/admin/match/${m.id}/umpire`} className="flex-1">
                        <Button size="sm" variant="primary" fullWidth>
                          <Shield size={13} /> Open Umpire UI
                        </Button>
                      </Link>
                    )}
                    {m.status === 'completed' && (
                      <Link to={`/match/${m.id}`} className="flex-1">
                        <Button size="sm" variant="secondary" fullWidth>View Result</Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteMatch(m.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── PLAYERS TAB ── */}
        {tab === 'players' && (
          <div className="space-y-2">
            <p className="text-white/40 text-xs">{players.length} registered players</p>
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link to={`/player/${p.id}`}>
                  <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3
                                  hover:border-sapphire/40 transition-all">
                    <Avatar name={p.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white truncate text-sm">{p.name}</p>
                        {p.role === 'admin' && <Badge variant="gold">Admin</Badge>}
                      </div>
                      <p className="text-white/30 text-xs truncate">{p.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gold font-semibold">{p.stats?.totalRuns || 0}R</p>
                      <p className="text-xs text-danger">{p.stats?.totalWickets || 0}W</p>
                    </div>
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

