import { doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { getMatchNotifications } from './notificationEvents'

export async function addNotificationsToBatch(batch, notifications) {
  const notificationRefs = notifications.flatMap(notification =>
    [...new Set(notification.recipients)].map(uid => ({
      ref: doc(db, 'users', uid, 'notifications', notification.id),
      notification,
    }))
  )

  const existing = await Promise.all(notificationRefs.map(({ ref }) => getDoc(ref)))
  const pending = notificationRefs.filter((_, index) => !existing[index].exists())
  pending.forEach(({ ref, notification }) => {
    batch.set(ref, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      matchId: notification.matchId,
      read: false,
      createdAt: serverTimestamp(),
    })
  })
  return pending.length
}
