import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'

const useAuthStore = create((set, get) => ({
  user: null,          // Firebase Auth user object
  profile: null,       // Firestore user profile
  bootstrapComplete: null,
  loading: true,
  initialized: false,

  // Initialize auth listener — call once in App.jsx
  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const [profileSnap, bootstrapSnap] = await Promise.all([
            getDoc(doc(db, 'users', firebaseUser.uid)),
            getDoc(doc(db, 'system', 'bootstrap')),
          ])
          const profile = profileSnap.exists() ? profileSnap.data() : null
          set({
            user: firebaseUser,
            profile,
            bootstrapComplete: bootstrapSnap.exists(),
            loading: false,
            initialized: true,
          })
        } catch (error) {
          console.error('Could not load Firebase account setup state', error)
          set({
            user: firebaseUser,
            profile: null,
            bootstrapComplete: false,
            loading: false,
            initialized: true,
          })
        }
      } else {
        set({ user: null, profile: null, bootstrapComplete: null, loading: false, initialized: true })
      }
    })
    return unsubscribe
  },

  // Refresh profile from Firestore (after role change etc.)
  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) set({ profile: snap.data() })
  },

  // Register new player
  register: async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const profile = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'player',
      createdAt: serverTimestamp(),
      notifications: [],
      stats: {
        totalMatches: 0,
        totalRuns: 0,
        totalWickets: 0,
        highScore: 0,
        bestBowling: '',
      },
    }
    const batch = writeBatch(db)
    const createdAt = serverTimestamp()
    batch.set(doc(db, 'users', cred.user.uid), profile)
    batch.set(doc(db, 'players', cred.user.uid), {
      name: profile.name,
      stats: profile.stats,
      createdAt,
    })
    await batch.commit()
    set({ user: cred.user, profile })
    return cred.user
  },

  // Login
  login: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap  = await getDoc(doc(db, 'users', cred.user.uid))
    const profile = snap.exists() ? snap.data() : null
    set({ user: cred.user, profile })
    return cred.user
  },

  claimFirstAdmin: async (name) => {
    const { user, profile, bootstrapComplete } = get()
    if (!user || bootstrapComplete !== false) {
      throw new Error('First-admin setup is not available for this account.')
    }

    const userRef = doc(db, 'users', user.uid)
    const bootstrapRef = doc(db, 'system', 'bootstrap')
    const batch = writeBatch(db)
    const createdAt = serverTimestamp()
    let adminProfile

    if (profile) {
      if (profile.role === 'admin') {
        adminProfile = profile
      } else if (profile.role === 'player') {
        batch.update(userRef, { role: 'admin' })
        adminProfile = { ...profile, role: 'admin' }
      } else {
        throw new Error('This account cannot claim first-admin setup.')
      }
    } else {
      adminProfile = {
        name: name.trim(),
        email: user.email || '',
        role: 'admin',
        createdAt,
        notifications: [],
        stats: {
          totalMatches: 0,
          totalRuns: 0,
          totalWickets: 0,
          highScore: 0,
          bestBowling: '',
        },
      }
      batch.set(userRef, adminProfile)
      batch.set(doc(db, 'players', user.uid), {
        name: adminProfile.name,
        stats: adminProfile.stats,
        createdAt,
      })
    }

    batch.set(bootstrapRef, { adminUid: user.uid, createdAt })
    await batch.commit()
    set({ profile: adminProfile, bootstrapComplete: true })
  },

  // Logout
  logout: async () => {
    await signOut(auth)
    set({ user: null, profile: null })
  },

  // Derived helpers
  isAdmin: () => get().profile?.role === 'admin',
  isLoggedIn: () => !!get().user,
}))

export default useAuthStore

