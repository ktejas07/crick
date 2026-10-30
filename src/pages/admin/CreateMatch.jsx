import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { motion } from 'framer-motion'
import { MapPin, Hash, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { db } from '../../firebase'
import useAuthStore from '../../store/useAuthStore'
import AppLayout from '../../components/Layout/AppLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const OVER_OPTIONS = [5, 6, 8, 10, 12, 15, 20]

export default function CreateMatch() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [title,   setTitle]   = useState('')
  const [venue,   setVenue]   = useState('')
  const [overs,   setOvers]   = useState(10)
  const [teamAName, setTeamAName] = useState('Team A')
  const [teamBName, setTeamBName] = useState('Team B')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Match title required'); return }
    if (!Number.isInteger(Number(overs)) || Number(overs) < 1 || Number(overs) > 50) {
      toast.error('Overs must be a whole number between 1 and 50')
      return
    }
    setLoading(true)
    try {
      const matchData = {
        title:    title.trim(),
        venue:    venue.trim() || 'TBD',
        overs: Number(overs),
        status:   'scheduled',
        teamA:    { name: teamAName.trim() || 'Team A', playerIds: [] },
        teamB:    { name: teamBName.trim() || 'Team B', playerIds: [] },
        innings:  [],
        toss:     null,
        result:   null,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        notifiedPlayers: [],
      }
      const ref = await addDoc(collection(db, 'matches'), matchData)
      toast.success('Match created! Now build your teams.')
      navigate(`/admin/match/${ref.id}/teams`)
    } catch (err) {
      toast.error('Failed to create match')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout title="Create Match" backTo="/admin">
      <div className="page-container pt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Header */}
          <div>
            <h1 className="font-display font-bold text-2xl text-white">New Match</h1>
            <p className="text-white/40 text-sm mt-0.5">Fill in match details, then assign players.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Match Details */}
            <div className="glass rounded-2xl p-4 space-y-4">
              <h2 className="font-display font-semibold text-white">Match Details</h2>
              <Input
                label="Match Title"
                placeholder="Friday Night T10"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
              <Input
                label="Venue"
                placeholder="CricArena Turf, Sector 15"
                icon={MapPin}
                value={venue}
                onChange={e => setVenue(e.target.value)}
              />

              {/* Overs selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-white/70">
                  Overs per side
                </label>
                <div className="flex gap-2 flex-wrap">
                  {OVER_OPTIONS.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOvers(o)}
                      className={`w-12 h-10 rounded-xl text-sm font-bold transition-all duration-200 ${
                        overs === o
                          ? 'bg-gold text-midnight shadow-gold'
                          : 'bg-midnight-200 text-white/50 border border-border hover:text-white'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <label className="block mt-2">
                  <span className="text-xs text-white/40">Or enter a custom number (1-50)</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    inputMode="numeric"
                    value={overs}
                    onChange={event => setOvers(event.target.value === '' ? '' : Number(event.target.value))}
                    className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-4 py-3 text-white
                               focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
                    aria-label="Custom overs per side"
                  />
                </label>
              </div>
            </div>

            {/* Teams */}
            <div className="glass rounded-2xl p-4 space-y-4">
              <h2 className="font-display font-semibold text-white">Team Names</h2>
              <div className="flex gap-3">
                <Input
                  label="Team A"
                  placeholder="Strikers"
                  value={teamAName}
                  onChange={e => setTeamAName(e.target.value)}
                />
                <Input
                  label="Team B"
                  placeholder="Blazers"
                  value={teamBName}
                  onChange={e => setTeamBName(e.target.value)}
                />
              </div>
              <p className="text-white/30 text-xs">
                You'll assign players to teams on the next screen.
              </p>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Create Match & Build Teams →
            </Button>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  )
}

