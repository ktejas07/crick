import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 3 })

const db = getFirestore()

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in with an administrator account.')
  }

  const adminProfile = await db.doc(`users/${request.auth.uid}`).get()
  if (!adminProfile.exists || adminProfile.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
}

export const createAdminAccount = onCall(async (request) => {
  await requireAdmin(request)

  const name = typeof request.data?.name === 'string' ? request.data.name.trim() : ''
  const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : ''
  const password = typeof request.data?.password === 'string' ? request.data.password : ''

  if (!name || name.length > 80) {
    throw new HttpsError('invalid-argument', 'Enter a name between 1 and 80 characters.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  }
  if (password.length < 6 || password.length > 128) {
    throw new HttpsError('invalid-argument', 'Password must be between 6 and 128 characters.')
  }

  let createdUser
  try {
    createdUser = await getAuth().createUser({ email, password, displayName: name })
    const profile = {
      name,
      email,
      role: 'admin',
      photoURL: null,
      createdAt: FieldValue.serverTimestamp(),
      notifications: [],
      stats: {
        totalMatches: 0,
        totalRuns: 0,
        totalWickets: 0,
        highScore: 0,
        bestBowling: '',
      },
    }

    const batch = db.batch()
    batch.create(db.doc(`users/${createdUser.uid}`), profile)
    batch.create(db.doc(`players/${createdUser.uid}`), {
      name,
      photoURL: null,
      stats: profile.stats,
      createdAt: FieldValue.serverTimestamp(),
    })
    await batch.commit()
  } catch (error) {
    if (createdUser) {
      try {
        await getAuth().deleteUser(createdUser.uid)
      } catch (cleanupError) {
        console.error('Could not roll back an incomplete admin account creation', cleanupError)
      }
    }
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account already uses this email address.')
    }
    if (error instanceof HttpsError) throw error
    console.error('Could not create admin account', error)
    throw new HttpsError('internal', 'Could not create the administrator account.')
  }

  return { uid: createdUser.uid, email }
})

export const deletePlayerAccount = onCall(async (request) => {
  await requireAdmin(request)

  const uid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : ''
  if (!uid || uid === request.auth.uid) {
    throw new HttpsError('invalid-argument', 'Choose a player account to delete.')
  }

  const userRef = db.doc(`users/${uid}`)
  const playerRef = db.doc(`players/${uid}`)
  const [userSnapshot, playerSnapshot] = await Promise.all([userRef.get(), playerRef.get()])
  if (!userSnapshot.exists || !playerSnapshot.exists) {
    throw new HttpsError('not-found', 'The player account could not be found.')
  }
  if (userSnapshot.data().role === 'admin') {
    throw new HttpsError('failed-precondition', 'Administrator accounts cannot be deleted here.')
  }

  try {
    await getAuth().deleteUser(uid)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      console.error('Could not delete player authentication account', error)
      throw new HttpsError('internal', 'Could not delete the player account.')
    }
  }

  try {
    const notifications = userRef.collection('notifications')
    while (true) {
      const snapshot = await notifications.limit(400).get()
      if (snapshot.empty) break
      const batch = db.batch()
      snapshot.docs.forEach(notification => batch.delete(notification.ref))
      await batch.commit()
    }

    const batch = db.batch()
    batch.delete(userRef)
    batch.delete(playerRef)
    await batch.commit()
  } catch (error) {
    console.error('Player sign-in was deleted, but profile cleanup failed', error)
    throw new HttpsError('internal', 'The sign-in was deleted, but profile cleanup failed. Contact support.')
  }

  return { uid }
})
