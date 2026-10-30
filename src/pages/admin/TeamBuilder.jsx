import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, collection, query, orderBy, getDocs, arrayUnion } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check, ChevronRight, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { db } from '../../firebase'
import AppLayout from '../../components/Layout/AppLayout'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'

export default function TeamBuilder() {
  const { id: matchId } = useParams()
  const navigate = useNavigate()

  const [match, setMatch]     = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  // Local state for team assignments
  const [teamA, setTeamA] = useState([]) // array of player uids
  const [teamB, setTeamB] = useState([])

  useEffect(() => {
    // Listen to match
    const unsub = onSnapshot(doc(db, 'matches', matchId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setMatch(data)
        setTeamA(data.teamA?.playerIds || [])
        setTeamB(data.teamB?.playerIds || [])
      }
      setLoading(false)
    })

    // Get all players once
    getDocs(query(collection(db, 'players'), orderBy('name'))).then(snap => {
      setAllPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return unsub
  }, [matchId])

  const addToTeam = (team, uid) => {
    if (team === 'A') {
      if (teamB.includes(uid)) { toast.error('Player already in Team B'); return }
      if (teamA.includes(uid)) return
      setTeamA(v => [...v, uid])
    } else {
      if (teamA.includes(uid)) { toast.error('Player already in Team A'); return }
      if (teamB.includes(uid)) return
      setTeamB(v => [...v, uid])
    }
  }

  const removeFromTeam = (team, uid) => {
    if (team === 'A') setTeamA(v => v.filter(id => id !== uid))
    else setTeamB(v => v.filter(id => id !== uid))
  }

  const saveTeams = async () => {
    if (teamA.length < 2 || teamB.length < 2) {
      toast.error('Each team needs at least 2 players'); return
    }
    setSaving(true)
    try {
      // Notify players (update their notification array in users collection)
      const allInvited = [...new Set([...teamA, ...teamB])]
      for (const uid of allInvited) {
        if (!match?.notifiedPlayers?.includes(uid)) {
          await updateDoc(doc(db, 'users', uid), {
            notifications: arrayUnion({
              matchId,
              title: 'You\'ve been added to a match!',
              message: `${match.title} — check it out!`,
              read: false,
              createdAt: Date.now(),
            })
          })
        }
      }

      await updateDoc(doc(db, 'matches', matchId), {
        'teamA.playerIds': teamA,
        'teamB.playerIds': teamB,
        notifiedPlayers: allInvited,
      })
      toast.success('Teams saved! Proceed to umpire setup.')
    } catch (err) {
      toast.error('Failed to save teams')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const getPlayer = (uid) => allPlayers.find(p => p.id === uid)

  const unassigned = allPlayers.filter(p => !teamA.includes(p.id) && !teamB.includes(p.id))

  if (loading) return (
    <AppLayout backTo="/admin"><div className="flex justify-center py-20"><Spinner size="lg" /></div></AppLayout>
  )

  return (
    <AppLayout title="Team Builder" backTo="/admin">
      <div className="page-container space-y-5 pt-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{match?.title}</h1>
          <p className="text-white/40 text-sm">Tap a player to assign to a team</p>
        </div>

        {/* Teams side by side */}
        <div className="grid grid-cols-2 gap-3">
          {['A', 'B'].map(team => {
            const teamPlayers = (team === 'A' ? teamA : teamB).map(uid => getPlayer(uid)).filter(Boolean)
            const teamName    = team === 'A' ? match?.teamA?.name : match?.teamB?.name
            const color       = team === 'A' ? 'border-sapphire/40 bg-sapphire/5' : 'border-gold/40 bg-gold/5'
            const badgeColor  = team === 'A' ? 'text-sapphire-light' : 'text-gold'

            return (
              <div key={team} className={`border rounded-2xl p-3 min-h-32 ${color}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-display font-bold text-sm ${badgeColor}`}>{teamName}</p>
                  <span className="text-xs text-white/30">{teamPlayers.length}</span>
                </div>
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {teamPlayers.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-1.5 bg-midnight-200 rounded-lg px-2 py-1.5"
                      >
                        <Avatar name={p.name} size="xs" />
                        <span className="text-xs text-white font-medium truncate flex-1">{p.name}</span>
                        <button
                          onClick={() => removeFromTeam(team, p.id)}
                          className="text-danger/60 hover:text-danger transition-colors ml-auto flex-shrink-0"
                        >
                          <Minus size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {teamPlayers.length === 0 && (
                    <p className="text-white/20 text-xs text-center py-2">Empty</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Unassigned players */}
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
            <Users size={11} /> Available Players ({unassigned.length})
          </p>
          <div className="space-y-2">
            {unassigned.length === 0 && allPlayers.length > 0 && (
              <p className="text-white/30 text-xs text-center py-3">All players assigned ✓</p>
            )}
            {unassigned.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-midnight-100 border border-border rounded-xl px-3 py-2.5">
                <Avatar name={p.name} size="sm" />
                <span className="text-sm text-white font-medium flex-1">{p.name}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => addToTeam('A', p.id)}
                    className="px-2.5 py-1 rounded-lg bg-sapphire/20 text-sapphire-light text-xs font-bold
                               hover:bg-sapphire/30 transition-colors border border-sapphire/30"
                  >
                    +A
                  </button>
                  <button
                    onClick={() => addToTeam('B', p.id)}
                    className="px-2.5 py-1 rounded-lg bg-gold/20 text-gold text-xs font-bold
                               hover:bg-gold/30 transition-colors border border-gold/30"
                  >
                    +B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save & Proceed */}
        <div className="space-y-2">
          <Button fullWidth size="lg" onClick={saveTeams} loading={saving}>
            <Check size={18} /> Save Teams
          </Button>
          <Button
            fullWidth size="lg" variant="sapphire"
            onClick={() => navigate(`/admin/match/${matchId}/umpire`)}
          >
            Proceed to Umpire UI <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

