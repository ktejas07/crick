import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  CircleDot,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { db } from '../../firebase'
import useAuthStore from '../../store/useAuthStore'

const notificationIcons = {
  'player-added': Users,
  scheduled: CalendarDays,
  milestone: Trophy,
  'hat-trick': Target,
  maiden: CircleDot,
  sixes: Sparkles,
  score: Activity,
  victory: Trophy,
  result: Check,
}

function getTimestamp(value) {
  if (value?.toDate) return value.toDate().getTime()
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  return 0
}

function formatTime(value) {
  const timestamp = getTimestamp(value)
  if (!timestamp) return 'Just now'
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp)
}

export default function NotificationCenter() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [legacyItems, setLegacyItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setItems([])
      setLegacyItems([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setLoadError(false)
    const handleError = error => {
      console.error('Could not load notifications', error)
      setLoadError(true)
      setLoading(false)
    }
    const unsubscribeItems = onSnapshot(
      query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc')),
      snapshot => {
        setItems(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
        setLoading(false)
      },
      handleError,
    )
    const unsubscribeLegacy = onSnapshot(
      doc(db, 'users', user.uid),
      snapshot => {
        setLegacyItems(snapshot.data()?.notifications || [])
        setLoading(false)
      },
      handleError,
    )

    return () => {
      unsubscribeItems()
      unsubscribeLegacy()
    }
  }, [user?.uid])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const notifications = useMemo(() => [
    ...items.map(item => ({ ...item, legacy: false })),
    ...legacyItems.map((item, index) => ({
      ...item,
      id: `legacy-${index}-${item.createdAt || index}`,
      legacy: true,
      legacyIndex: index,
    })),
  ].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)), [items, legacyItems])
  const unreadCount = notifications.filter(notification => !notification.read).length

  const markRead = async notification => {
    if (notification.read) return
    if (notification.legacy) {
      const updated = legacyItems.map((item, index) =>
        index === notification.legacyIndex ? { ...item, read: true } : item
      )
      await updateDoc(doc(db, 'users', user.uid), { notifications: updated })
      return
    }
    await updateDoc(doc(db, 'users', user.uid, 'notifications', notification.id), { read: true })
  }

  const handleNotificationClick = async notification => {
    try {
      await markRead(notification)
      setOpen(false)
      if (notification.matchId) navigate(`/match/${notification.matchId}`)
    } catch (error) {
      console.error('Could not open notification', error)
      toast.error('Could not open this notification. Please try again.')
    }
  }

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter(notification => !notification.read)
    if (!unreadItems.length) return

    try {
      const documentItems = unreadItems.filter(notification => !notification.legacy)
      for (let offset = 0; offset < documentItems.length; offset += 450) {
        const batch = writeBatch(db)
        documentItems.slice(offset, offset + 450).forEach(notification => {
          batch.update(doc(db, 'users', user.uid, 'notifications', notification.id), { read: true })
        })
        await batch.commit()
      }

      if (unreadItems.some(notification => notification.legacy)) {
        await updateDoc(doc(db, 'users', user.uid), {
          notifications: legacyItems.map(notification => ({ ...notification, read: true })),
        })
      }
    } catch (error) {
      console.error('Could not mark notifications as read', error)
      toast.error('Could not update notifications. Please try again.')
    }
  }

  return (
    <div className="notification-center" ref={containerRef}>
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.9 }}
        onClick={() => setOpen(value => !value)}
        className={`notification-bell ${open ? 'notification-bell-open' : ''}`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="notification-count"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Notifications"
            className="notification-panel"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          >
            <header className="notification-panel-header">
              <div>
                <p className="notification-eyebrow">YOUR CRICKET CIRCLE</p>
                <h2>Notifications</h2>
              </div>
              {unreadCount > 0 && (
                <button type="button" className="notification-mark-all" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </header>

            <div className="notification-list">
              {loading && <p className="notification-state">Loading your updates…</p>}
              {!loading && loadError && (
                <p className="notification-state notification-error">Notifications couldn’t be loaded. Try refreshing the page.</p>
              )}
              {!loading && !loadError && notifications.length === 0 && (
                <div className="notification-empty">
                  <span><Bell size={19} /></span>
                  <strong>You’re all caught up</strong>
                  <p>Match moments and team updates will appear here.</p>
                </div>
              )}
              {!loadError && notifications.slice(0, 40).map((notification, index) => {
                const Icon = notificationIcons[notification.type] || Bell
                return (
                  <motion.button
                    key={notification.id}
                    type="button"
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.2) }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`notification-item ${notification.read ? '' : 'notification-item-unread'}`}
                  >
                    <span className={`notification-item-icon notification-icon-${notification.type || 'default'}`}>
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="notification-item-copy">
                      <span className="notification-item-title">{notification.title || 'Match update'}</span>
                      <span className="notification-item-message">{notification.message || 'There’s a new update for you.'}</span>
                      <span className="notification-item-time">{formatTime(notification.createdAt)}</span>
                    </span>
                    {!notification.read && <span className="notification-unread-dot" aria-label="Unread" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
