import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { deleteField, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'

const MAX_PROFILE_PHOTO_BYTES = 240 * 1024

async function createProfilePhotoDataUrl(file, crop) {
  const image = await createImageBitmap(file)
  try {
    const dimension = 256
    const scale = Math.max(dimension / image.width, dimension / image.height)
    const zoom = Math.max(1, Math.min(3, crop.zoom))
    const offsetScale = dimension / crop.previewSize
    const width = image.width * scale * zoom
    const height = image.height * scale * zoom
    const x = (dimension - width) / 2 + crop.offsetX * offsetScale
    const y = (dimension - height) / 2 + crop.offsetY * offsetScale

    for (const quality of [0.82, 0.68, 0.54, 0.4]) {
      const canvas = document.createElement('canvas')
      canvas.width = dimension
      canvas.height = dimension
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Your browser could not process this image.')
      context.drawImage(image, x, y, width, height)

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_PROFILE_PHOTO_BYTES) {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(reader.error || new Error('Could not read the compressed photo.'))
          reader.readAsDataURL(blob)
        })
      }
    }
  } finally {
    image.close()
  }

  throw new Error('Could not compress this image enough. Try a smaller photo.')
}

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

  saveProfilePhoto: async (file, crop = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    previewSize: 256,
  }) => {
    const { user } = get()
    if (!user) throw new Error('You must be signed in to upload a profile photo.')
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Choose a JPG, PNG, or WebP image.')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('The image must be 5 MB or smaller.')
    }

    const photoURL = await createProfilePhotoDataUrl(file, crop)
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', user.uid), { photoURL, photoPath: deleteField() })
    batch.update(doc(db, 'players', user.uid), { photoURL })
    await batch.commit()

    set(state => ({
      profile: { ...state.profile, photoURL, photoPath: undefined },
    }))

    return { photoURL }
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
      photoURL: null,
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
      photoURL: profile.photoURL,
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
        photoURL: null,
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
        photoURL: adminProfile.photoURL,
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
