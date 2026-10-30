import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'
import Button from '../../components/ui/Button'

export default function FirstAdminSetup() {
  const { user, profile, claimFirstAdmin, logout } = useAuthStore()
  const isExistingAdmin = profile?.role === 'admin'
  const [name, setName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async () => {
    if (!profile && !name.trim()) {
      setError('Enter your name to finish account setup.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await claimFirstAdmin(name)
    } catch (err) {
      setError(err.code === 'permission-denied'
        ? 'Firestore denied setup. Publish the current firestore.rules, then try again.'
        : err.message || 'Could not complete admin setup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-twilight flex items-center justify-center px-5 py-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-2xl p-6 sm:p-8"
      >
        <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center mb-5">
          <ShieldCheck className="text-gold" size={24} />
        </div>
        <p className="text-gold text-xs font-bold uppercase tracking-widest mb-2">Initial setup</p>
        <h1 className="font-display font-bold text-2xl text-white">Set up CricArena</h1>
        <p className="text-white/55 text-sm mt-2 leading-6">
          {isExistingAdmin
            ? 'Finish linking this administrator account to the initial setup.'
            : 'No administrator is configured yet. This account can claim the first admin role once.'}
        </p>
        {profile ? (
          <div className="mt-5 bg-midnight-200 border border-border rounded-xl px-4 py-3">
            <p className="text-white font-semibold">{profile.name}</p>
            <p className="text-white/40 text-sm">{user?.email}</p>
          </div>
        ) : (
          <label className="block mt-5">
            <span className="text-white/70 text-sm font-medium">Your name</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              autoComplete="name"
              className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-4 py-3 text-white
                         placeholder-white/30 focus:outline-none focus:border-gold"
              placeholder="Full name"
            />
            <span className="block mt-2 text-white/35 text-xs">{user?.email}</span>
          </label>
        )}
        {error && <p role="alert" className="mt-4 text-danger text-sm">{error}</p>}
        <Button fullWidth size="lg" onClick={handleSetup} loading={saving} className="mt-6">
          {isExistingAdmin ? 'Finish admin setup' : 'Claim first admin role'}
        </Button>
        <button
          onClick={logout}
          className="w-full mt-4 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Sign out
        </button>
      </motion.section>
    </main>
  )
}