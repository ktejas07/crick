import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { RotateCcw, ArrowLeftRight, ChevronRight, Pencil, Zap, Coins, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { db } from '../../firebase'
import AppLayout from '../../components/Layout/AppLayout'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import {
  createInnings,
  processDelivery,
  undoLastBall,
  isInningsComplete,
  getChaseWinResult,
  getMatchResult,
  formatOvers,
  getCurrentOverBalls,
  DELIVERY_TYPES,
  WICKET_TYPES,
} from '../../utils/cricketEngine'
import { createPublicMatchView } from '../../utils/publicMatch'
import { addNotificationsToBatch, getMatchNotifications } from '../../utils/notifications'

// ─── Button configs ──────────────────────────────────────────────────────────
const RUN_BUTTONS = [
  { label: '0', runs: 0, color: 'bg-midnight-300 border-border text-white/80',        size: 'normal' },
  { label: '1', runs: 1, color: 'bg-midnight-300 border-border text-white',            size: 'normal' },
  { label: '2', runs: 2, color: 'bg-midnight-300 border-border text-white',            size: 'normal' },
  { label: '3', runs: 3, color: 'bg-midnight-300 border-border text-white',            size: 'normal' },
  { label: '4', runs: 4, color: 'bg-sapphire border-sapphire text-white',             size: 'large'  },
  { label: '6', runs: 6, color: 'bg-gold border-gold text-midnight font-black',       size: 'large'  },
]

const EXTRA_BUTTONS = [
  { label: 'WD',   type: DELIVERY_TYPES.WIDE,   color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' },
  { label: 'NB',   type: DELIVERY_TYPES.NOBALL,  color: 'bg-orange-500/20 border-orange-500/50 text-orange-300' },
  { label: 'BYE',  type: DELIVERY_TYPES.BYE,     color: 'bg-white/10 border-white/20 text-white/70' },
  { label: 'LB',   type: DELIVERY_TYPES.LEGBYE,  color: 'bg-white/10 border-white/20 text-white/70' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function BallDot({ ball }) {
  if (!ball) return <div className="ball-dot ball-dot-empty" />
  let cls = 'ball-dot-normal'
  let label = ball.runs ?? '·'
  if (ball.isWicket)               { cls = 'ball-dot-wicket'; label = 'W' }
  else if (ball.type === 'wide')   { cls = 'ball-dot-wide';   label = 'Wd' }
  else if (ball.type === 'noball') { cls = 'ball-dot-noball'; label = 'NB' }
  else if (ball.runs === 4)        { cls = 'ball-dot-four' }
  else if (ball.runs === 6)        { cls = 'ball-dot-six' }
  return <div className={`ball-dot ${cls}`}>{label}</div>
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UmpireUI() {
  const { id: matchId } = useParams()
  const reduceMotion = useReducedMotion()

  const [match,   setMatch]   = useState(null)
  const [players, setPlayers] = useState({}) // uid → profile
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // Modals
  const [showWicket,   setShowWicket]   = useState(false)
  const [showBatsman,  setShowBatsman]  = useState(false)
  const [showBowler,   setShowBowler]   = useState(false)
  const [batsmanToReplace, setBatsmanToReplace] = useState('')
  const [showEnd,      setShowEnd]      = useState(false)

  // Pending delivery (for extras + runs combination)
  const [pendingDelivery, setPendingDelivery] = useState(null)
  const [pendingExtra, setPendingExtra]       = useState(null) // 'wide'|'noball' etc waiting for run count

  // Wicket form
  const [wicketType,       setWicketType]       = useState(WICKET_TYPES[0])
  const [fielder,          setFielder]           = useState('')
  const [dismissedBatter,  setDismissedBatter]   = useState('striker')

  // Toss
  const [tossWinner, setTossWinner] = useState(null)
  const [tossSide, setTossSide] = useState(null)
  const [tossChoice, setTossChoice] = useState('bat')
  const [isTossing, setIsTossing] = useState(false)
  const [coinHasFlipped, setCoinHasFlipped] = useState(false)
  const finishCoinAnimation = useRef(null)
  const coinFlipLock = useRef(false)
  const [openingStriker, setOpeningStriker] = useState('')
  const [openingNonStriker, setOpeningNonStriker] = useState('')
  const [openingBowler, setOpeningBowler] = useState('')
  const [innings2Striker, setInnings2Striker] = useState('')
  const [innings2NonStriker, setInnings2NonStriker] = useState('')
  const [innings2Bowler, setInnings2Bowler] = useState('')

  // ── Listen to match ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'matches', matchId), snap => {
      if (snap.exists()) setMatch({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
    return unsub
  }, [matchId])

  // ── Load players ──────────────────────────────────────────────────
  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      const map = {}
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() } })
      setPlayers(map)
    })
  }, [])

  // ── Derived state ─────────────────────────────────────────────────
  const inningsIdx = match?.status === 'innings2' ? 1 : 0
  const innings    = match?.innings?.[inningsIdx]
  const isLive     = match?.status === 'innings1' || match?.status === 'innings2'

  const getPlayerName = useCallback((uid) =>
    players[uid]?.name?.split(' ')[0] || uid?.slice(0, 6) || '?', [players])

  const tossWinnerId = isTossing ? null : tossWinner || match?.toss?.winner || null
  const tossSideResult = tossSide || match?.toss?.side
    || (match?.toss?.winner ? (match.toss.winner === 'teamA' ? 'heads' : 'tails') : null)
  const tossBattingTeam = !tossWinnerId
    ? null
    : tossChoice === 'bat' ? tossWinnerId : tossWinnerId === 'teamA' ? 'teamB' : 'teamA'
  const openingPlayerIds = tossBattingTeam === 'teamA'
    ? (match?.teamA?.playerIds || [])
    : tossBattingTeam === 'teamB' ? (match?.teamB?.playerIds || []) : []
  const openingBowlingTeam = tossBattingTeam === 'teamA' ? 'teamB' : 'teamA'
  const openingBowlerIds = openingBowlingTeam === 'teamA'
    ? (match?.teamA?.playerIds || [])
    : tossBattingTeam ? (match?.teamB?.playerIds || []) : []
  const openingStrikerId = openingPlayerIds.includes(openingStriker)
    ? openingStriker
    : openingPlayerIds[0] || ''
  const openingNonStrikerId = openingPlayerIds.includes(openingNonStriker) && openingNonStriker !== openingStrikerId
    ? openingNonStriker
    : openingPlayerIds.find(uid => uid !== openingStrikerId) || ''
  const openingBowlerId = openingBowlerIds.includes(openingBowler)
    ? openingBowler
    : openingBowlerIds[0] || ''

  const innings2BattingTeam = innings?.battingTeam === 'teamA' ? 'teamB' : 'teamA'
  const innings2BowlingTeam = innings?.battingTeam || 'teamA'
  const innings2BattingIds = innings2BattingTeam === 'teamA'
    ? (match?.teamA?.playerIds || [])
    : (match?.teamB?.playerIds || [])
  const innings2BowlingIds = innings2BowlingTeam === 'teamA'
    ? (match?.teamA?.playerIds || [])
    : (match?.teamB?.playerIds || [])
  const innings2StrikerId = innings2BattingIds.includes(innings2Striker)
    ? innings2Striker
    : innings2BattingIds[0] || ''
  const innings2NonStrikerId = innings2BattingIds.includes(innings2NonStriker) && innings2NonStriker !== innings2StrikerId
    ? innings2NonStriker
    : innings2BattingIds.find(uid => uid !== innings2StrikerId) || ''
  const innings2BowlerId = innings2BowlingIds.includes(innings2Bowler)
    ? innings2Bowler
    : innings2BowlingIds[0] || ''

  const currentOverBalls = innings ? getCurrentOverBalls(innings) : []
  const slots            = Array.from({ length: 6 }, (_, i) => currentOverBalls[i] || null)

  const persistMatchUpdates = useCallback(async (updates, additionalNotifications = []) => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'matches', matchId), updates)
    if (match?.publicShareCode) {
      const playerNames = Object.fromEntries(
        Object.entries(players).map(([uid, player]) => [uid, player.name])
      )
      batch.set(
        doc(db, 'publicMatches', match.publicShareCode),
        createPublicMatchView({ ...match, ...updates }, matchId, playerNames)
      )
    }
    const nextMatch = { ...match, ...updates }
    const notifications = [
      ...getMatchNotifications(match, nextMatch, matchId, players),
      ...additionalNotifications,
    ]
    await addNotificationsToBatch(batch, notifications)
    await batch.commit()
  }, [match, matchId, players])

  // ── Persist innings to Firestore ──────────────────────────────────
  const saveInnings = useCallback(async (updatedInnings, extraUpdates = {}) => {
    setSaving(true)
    try {
      const updatedMatch = { ...match }
      const newInnings   = [...(updatedMatch.innings || [])]
      newInnings[inningsIdx] = updatedInnings
      await persistMatchUpdates({
        innings: newInnings,
        ...extraUpdates,
      })
      return true
    } catch (err) {
      toast.error('Save failed — check connection')
      console.error(err)
      return false
    } finally {
      setSaving(false)
    }
  }, [match, inningsIdx, matchId, persistMatchUpdates])

  // ── Handle delivery ───────────────────────────────────────────────
  const handleDelivery = useCallback(async (delivery) => {
    if (!innings || saving) return

    // Annotate with striker/bowler snapshots for undo
    const annotated = {
      ...delivery,
      strikerBefore:    innings.striker,
      nonStrikerBefore: innings.nonStriker,
      bowlerBefore:     innings.currentBowler,
    }

    const result = processDelivery(innings, annotated)
    let newInnings = result.innings
    const { needsNewBatsman, needsNewBowler } = result
    const battingPlayerIds = (newInnings.battingTeam === 'teamA'
      ? match.teamA?.playerIds
      : match.teamB?.playerIds) || []

    if (inningsIdx === 1) {
      const target = (match.innings?.[0]?.runs || 0) + 1
      const battingTeamName = newInnings.battingTeam === 'teamA' ? match.teamA?.name : match.teamB?.name
      const chaseResult = getChaseWinResult(newInnings, target, battingTeamName || 'Batting team')
      if (chaseResult) {
        const saved = await saveInnings(newInnings, { status: 'completed', result: chaseResult })
        if (saved) toast.success(chaseResult)
        return
      }
    }

    // Check innings complete
    const complete = isInningsComplete(newInnings, match.overs, battingPlayerIds.length || 10)

    if (complete) {
      if (inningsIdx === 1) {
        const matchResult = getMatchResult(
          match.innings[0],
          newInnings,
          match.teamA?.name || 'Team A',
          match.teamB?.name || 'Team B',
        )
        const saved = await saveInnings(newInnings, { status: 'completed', result: matchResult })
        if (saved) toast.success(matchResult)
        return
      }
      await saveInnings(newInnings)
      setShowEnd(true)
      return
    }

    if (needsNewBatsman) {
      const availableBatsmen = battingPlayerIds.filter(uid =>
        uid !== newInnings.striker
        && uid !== newInnings.nonStriker
        && !newInnings.batting?.[uid]?.isOut
      )

      if (availableBatsmen.length === 0) {
        const remainingBatter = [newInnings.striker, newInnings.nonStriker]
          .find(uid => uid && !newInnings.batting?.[uid]?.isOut)
        if (remainingBatter) {
          newInnings = { ...newInnings, striker: remainingBatter, nonStriker: null }
          await saveInnings(newInnings)
          toast('Last batter continues alone')
          return
        }
      }

      // Save first, then prompt
      await saveInnings(newInnings)
      if (availableBatsmen.length === 0) {
        setShowEnd(true)
        return
      }
      setTimeout(() => setShowBatsman(true), 400)
      return
    }

    if (needsNewBowler) {
      await saveInnings(newInnings)
      setTimeout(() => setShowBowler(true), 300)
      return
    }

    await saveInnings(newInnings)
  }, [innings, inningsIdx, saving, match, saveInnings])

  // ── Run button tap ────────────────────────────────────────────────
  const handleRunButton = (runs) => {
    if (pendingExtra) {
      // Extra + runs (e.g. Wide + 2)
      handleDelivery({ type: pendingExtra, runs })
      setPendingExtra(null)
    } else {
      handleDelivery({ type: DELIVERY_TYPES.NORMAL, runs })
    }
  }

  // ── Extra button tap ──────────────────────────────────────────────
  const handleExtraButton = (type) => {
    if (type === DELIVERY_TYPES.WIDE || type === DELIVERY_TYPES.NOBALL) {
      // Need to know if runs were scored too
      setPendingExtra(type)
      toast('How many runs? Tap a run button.', { icon: '⚡', duration: 2000 })
    } else {
      // Bye / LB — also need run count
      setPendingExtra(type)
      toast('Bye/LB runs? Tap a run button.', { icon: '⚡', duration: 2000 })
    }
  }

  const cancelExtra = () => { setPendingExtra(null); toast.dismiss() }

  // ── Wicket ────────────────────────────────────────────────────────
  const handleWicketConfirm = () => {
    const dismissed = dismissedBatter === 'nonStriker' && innings.nonStriker
      ? innings.nonStriker
      : innings.striker
    handleDelivery({
      type:           DELIVERY_TYPES.NORMAL,
      runs:           0,
      isWicket:       true,
      wicketType,
      fielder,
      dismissedBatter: dismissed,
    })
    setShowWicket(false)
    setFielder('')
    setWicketType(WICKET_TYPES[0])
    setDismissedBatter('striker')
  }

  // ── Undo ──────────────────────────────────────────────────────────
  const handleUndo = async () => {
    if (!innings?.balls?.length) { toast.error('Nothing to undo'); return }
    const rebuilt = undoLastBall(innings)
    await saveInnings(rebuilt)
    toast.success('Last ball undone')
  }

  // ── Select next batsman ───────────────────────────────────────────
  const handleSelectBatsman = async (uid) => {
    const newInn = {
      ...innings,
      [batsmanToReplace || 'striker']: uid,
    }
    const saved = await saveInnings(newInn)
    if (!saved) return
    setShowBatsman(false)
    const replacing = Boolean(batsmanToReplace)
    setBatsmanToReplace('')
    toast.success(replacing ? `${getPlayerName(uid)} replaces the batter` : `${getPlayerName(uid)} is in`)
  }

  // ── Select next bowler ────────────────────────────────────────────
  const handleSelectBowler = async (uid) => {
    const newInn = { ...innings, currentBowler: uid }
    await saveInnings(newInn)
    setShowBowler(false)
    toast.success(`${getPlayerName(uid)} to bowl`)
  }

  const handleSwapBatsmen = async () => {
    if (!innings?.striker || !innings?.nonStriker || saving) return
    const saved = await saveInnings({
      ...innings,
      striker: innings.nonStriker,
      nonStriker: innings.striker,
    })
    if (saved) toast.success('Striker and non-striker swapped')
  }

  // ── Toss setup ────────────────────────────────────────────────────
  const handleTossConfirm = async () => {
    if (!tossWinnerId) {
      toast.error('Flip the coin before setting up the innings')
      return
    }

    const battingTeam = tossChoice === 'bat' ? tossWinnerId : (tossWinnerId === 'teamA' ? 'teamB' : 'teamA')
    const bowlingTeam = battingTeam === 'teamA' ? 'teamB' : 'teamA'

    const battingPlayerIds = battingTeam === 'teamA'
      ? match.teamA?.playerIds || []
      : match.teamB?.playerIds || []
    const bowlingPlayerIds = bowlingTeam === 'teamA'
      ? match.teamA?.playerIds || []
      : match.teamB?.playerIds || []

    if (battingPlayerIds.length < 2) { toast.error('Need at least 2 players in batting team'); return }
    if (bowlingPlayerIds.length < 1) { toast.error('Need at least 1 player in bowling team'); return }

    const firstBatsman1  = openingPlayerIds.includes(openingStrikerId) ? openingStrikerId : battingPlayerIds[0]
    const firstBatsman2  = openingPlayerIds.includes(openingNonStrikerId) && openingNonStrikerId !== firstBatsman1
      ? openingNonStrikerId
      : battingPlayerIds.find(uid => uid !== firstBatsman1)
    const firstBowler = openingBowlerIds.includes(openingBowlerId) ? openingBowlerId : ''

    if (!firstBatsman1 || !firstBatsman2 || firstBatsman1 === firstBatsman2) {
      toast.error('Select two different opening batsmen')
      return
    }
    if (!firstBowler) {
      toast.error('Select an opening bowler')
      return
    }

    const newInnings = createInnings(battingTeam, bowlingTeam, firstBatsman1, firstBatsman2, firstBowler)
    const tossWinnerName = tossWinnerId === 'teamA'
      ? match.teamA?.name || 'Team A'
      : match.teamB?.name || 'Team B'
    const battingTeamName = battingTeam === 'teamA'
      ? match.teamA?.name || 'Team A'
      : match.teamB?.name || 'Team B'

    try {
      await persistMatchUpdates({
        status:  'innings1',
        toss:    { ...match.toss, winner: tossWinnerId, side: tossSideResult, choice: tossChoice },
        innings: [newInnings],
      }, [{
        id: `match-${matchId}-toss-decision`,
        type: 'toss-decision',
        title: 'The toss is decided',
        message: `${tossWinnerName} won the toss and chose to ${tossChoice} first. ${battingTeamName} will bat first.`,
        matchId,
        recipients: [...new Set([
          ...(match.teamA?.playerIds || []),
          ...(match.teamB?.playerIds || []),
        ])],
      }])
      toast.success('Match started! 🏏')
    } catch (error) {
      console.error('Failed to start match', error)
      toast.error('Could not start the match. Please try again.')
    }
  }

  const handleCoinFlip = async () => {
    if (coinFlipLock.current || isTossing || tossWinnerId) return
    coinFlipLock.current = true

    const side = Math.random() < 0.5 ? 'heads' : 'tails'
    const winner = side === 'heads' ? 'teamA' : 'teamB'
    const animationPromise = new Promise(resolve => {
      finishCoinAnimation.current = resolve
    })

    setTossSide(side)
    setIsTossing(true)

    try {
      await Promise.all([
        persistMatchUpdates({
          status: 'toss',
          toss: { winner, side, choice: null, flippedAt: Date.now() },
        }),
        animationPromise,
      ])
      setTossWinner(winner)
      setCoinHasFlipped(true)
      setIsTossing(false)
      coinFlipLock.current = false
    } catch (error) {
      coinFlipLock.current = false
      finishCoinAnimation.current?.()
      finishCoinAnimation.current = null
      setIsTossing(false)
      setTossSide(null)
      setCoinHasFlipped(false)
      setMatch(current => current ? { ...current, status: 'scheduled', toss: null } : current)
      console.error('Could not save toss result', error)
      toast.error('Could not save the toss. Please try again.')
    }
  }

  const handleRetoss = async () => {
    if (coinFlipLock.current || isTossing) return
    coinFlipLock.current = true

    try {
      await persistMatchUpdates({ status: 'scheduled', toss: null })
      setMatch(current => current ? { ...current, status: 'scheduled', toss: null } : current)
      setTossWinner(null)
      setTossSide(null)
      setTossChoice('bat')
      setCoinHasFlipped(false)
      toast.success('Toss reset. Flip again when you’re ready.')
    } catch (error) {
      console.error('Could not reset toss', error)
      toast.error('Could not reset the toss. Please try again.')
    } finally {
      coinFlipLock.current = false
    }
  }

  // ── End innings / start innings2 ──────────────────────────────────
  const handleEndInnings = async () => {
    if (match.status === 'innings1') {
      // Start innings 2
      const prevBatting = innings.battingTeam
      const battingTeam = prevBatting === 'teamA' ? 'teamB' : 'teamA'
      const bowlingTeam = prevBatting

      const battingIds = battingTeam === 'teamA' ? match.teamA?.playerIds || [] : match.teamB?.playerIds || []
      const bowlingIds = bowlingTeam === 'teamA' ? match.teamA?.playerIds || [] : match.teamB?.playerIds || []
      const striker = battingIds.includes(innings2StrikerId) ? innings2StrikerId : ''
      const nonStriker = battingIds.includes(innings2NonStrikerId) && innings2NonStrikerId !== striker
        ? innings2NonStrikerId
        : ''
      const bowler = bowlingIds.includes(innings2BowlerId) ? innings2BowlerId : ''

      if (!striker || !nonStriker || !bowler) {
        toast.error('Select two opening batsmen and an opening bowler')
        return
      }

      const newInnings2 = createInnings(battingTeam, bowlingTeam, striker, nonStriker, bowler)

      const newAllInnings = [innings, newInnings2]
      try {
        await persistMatchUpdates({
          innings: newAllInnings,
          status: 'innings2',
        })
        setShowEnd(false)
        toast.success('Innings 2 started!')
      } catch (error) {
        console.error('Failed to start second innings', error)
        toast.error('Could not start the next innings. Please try again.')
      }
    } else {
      // Complete match — determine result
      const inn1 = match.innings[0]
      const inn2 = innings
      const result = getMatchResult(inn1, inn2, match.teamA.name, match.teamB.name)

      try {
        await persistMatchUpdates({
          innings: match.innings.map((inn, i) => i === inningsIdx ? innings : inn),
          status: 'completed',
          result,
        })
        setShowEnd(false)
        toast.success('Match completed! 🏆')
      } catch (error) {
        console.error('Failed to complete match', error)
        toast.error('Could not complete the match. Please try again.')
      }
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) return (
    <AppLayout backTo="/admin">
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </AppLayout>
  )

  if (!match) return (
    <AppLayout backTo="/admin">
      <div className="page-container text-center py-20 text-white/40">Match not found.</div>
    </AppLayout>
  )

  // PRE-TOSS SCREEN
  if (match.status === 'scheduled' || match.status === 'toss') {
    const coinRotation = tossSideResult === 'tails' ? 8 * 360 + 180 : 8 * 360
    const tossTeamName = tossWinnerId === 'teamA' ? match.teamA?.name : match.teamB?.name

    return (
      <AppLayout title="Umpire" backTo="/admin">
        <div className="page-container pt-4 space-y-5 toss-page">
          <div className="toss-page-heading">
            <p className="toss-eyebrow"><Sparkles size={13} /> THE MOMENT BEFORE THE MATCH</p>
            <h1 className="font-display font-bold text-2xl text-white">{match.title}</h1>
            <p className="text-white/40 text-sm">Let the coin decide who calls the first move.</p>
          </div>

          <section className="toss-stage" aria-label="Coin toss">
            <div className="toss-team-label toss-team-heads">
              <span className="toss-side-label">HEADS</span>
              <strong>{match.teamA?.name || 'Team A'}</strong>
            </div>
            <div className="toss-team-label toss-team-tails">
              <span className="toss-side-label">TAILS</span>
              <strong>{match.teamB?.name || 'Team B'}</strong>
            </div>

            <motion.div
              className="toss-coin-scene"
              animate={{
                y: isTossing ? [0, -42, -88, -48, -76, -34, 0] : 0,
              }}
              transition={{
                duration: isTossing ? 3.6 : reduceMotion ? 0.01 : 0.35,
                times: [0, 0.14, 0.3, 0.48, 0.66, 0.83, 1],
                ease: 'easeInOut',
              }}
              onAnimationComplete={() => {
                if (!isTossing) return
                finishCoinAnimation.current?.()
                finishCoinAnimation.current = null
              }}
            >
              <motion.div
                className="toss-coin-spin"
                animate={{
                  rotateY: isTossing || coinHasFlipped ? coinRotation : tossSideResult === 'tails' ? 180 : 0,
                  rotateZ: isTossing ? [0, 16, -12, 10, -6, 3, 0] : 0,
                }}
                transition={{
                  duration: isTossing ? 3.6 : reduceMotion ? 0.01 : 0.35,
                  times: [0, 0.14, 0.3, 0.48, 0.66, 0.83, 1],
                  ease: isTossing ? [0.18, 0.68, 0.3, 1] : 'easeOut',
                }}
              >
                <div className="toss-coin">
                  <div className="toss-coin-face toss-coin-heads">
                    <span className="toss-coin-mark">CA</span>
                    <span>HEADS</span>
                  </div>
                  <div className="toss-coin-face toss-coin-tails">
                    <Coins size={27} strokeWidth={1.4} />
                    <span>TAILS</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <AnimatePresence mode="wait">
              {tossWinnerId ? (
                <motion.div
                  key="toss-result"
                  className="toss-result"
                  initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                >
                  <span>{tossSideResult === 'heads' ? 'HEADS' : 'TAILS'} — THE TOSS GOES TO</span>
                  <strong>{tossTeamName}</strong>
                </motion.div>
              ) : (
                <motion.p
                  key="toss-prompt"
                  className="toss-prompt"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {isTossing ? 'The coin is in the air…' : 'Ready when you are, Umpire.'}
                </motion.p>
              )}
            </AnimatePresence>

            {!tossWinnerId && (
              <motion.button
                type="button"
                onClick={handleCoinFlip}
                disabled={isTossing}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className="toss-flip-button"
              >
                <Coins size={17} />
                {isTossing ? 'Flipping…' : 'Flip the coin'}
              </motion.button>
            )}
            {tossWinnerId && (
              <button
                type="button"
                onClick={handleRetoss}
                className="toss-retoss-button"
              >
                <RotateCcw size={13} /> Retoss
              </button>
            )}
          </section>

          <AnimatePresence>
            {tossWinnerId && (
              <motion.section
                className="glass toss-setup-card"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.25 }}
              >
                <div className="toss-setup-heading">
                  <div>
                    <p className="toss-eyebrow">THE CAPTAIN’S CALL</p>
                    <h2>{tossTeamName} won the toss</h2>
                  </div>
                  <span className="toss-setup-icon"><Zap size={17} /></span>
                </div>
                <p className="text-white/50 text-sm">Choose how they’ll start the match.</p>
                <div className="toss-choice-grid" role="group" aria-label="Toss winner's decision">
                {['bat', 'bowl'].map(c => (
                  <button
                    key={c}
                    onClick={() => setTossChoice(c)}
                    className={`toss-choice-button ${tossChoice === c ? 'toss-choice-selected' : ''}`}
                    aria-pressed={tossChoice === c}
                  >
                    <span>{c === 'bat' ? 'Bat first' : 'Bowl first'}</span>
                    <small>{c === 'bat' ? 'Set the target' : 'Chase the total'}</small>
                  </button>
                ))}
                </div>
                <div className="toss-player-grid">
                  <label className="min-w-0">
                    <span className="text-white/60 text-xs font-semibold">Opening striker</span>
                    <select
                      value={openingStrikerId}
                      onChange={event => setOpeningStriker(event.target.value)}
                      className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                    >
                      {openingPlayerIds.length === 0 && <option value="">No players available</option>}
                      {openingPlayerIds.map(uid => (
                        <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0">
                    <span className="text-white/60 text-xs font-semibold">Opening non-striker</span>
                    <select
                      value={openingNonStrikerId}
                      onChange={event => setOpeningNonStriker(event.target.value)}
                      className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                    >
                      {openingPlayerIds.filter(uid => uid !== openingStrikerId).length === 0 && (
                        <option value="">No other batter available</option>
                      )}
                      {openingPlayerIds.filter(uid => uid !== openingStrikerId).map(uid => (
                        <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0 col-span-2">
                    <span className="text-white/60 text-xs font-semibold">Opening bowler</span>
                    <select
                      value={openingBowlerId}
                      onChange={event => setOpeningBowler(event.target.value)}
                      className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                    >
                      {openingBowlerIds.length === 0 && <option value="">No players available</option>}
                      {openingBowlerIds.map(uid => (
                        <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <Button fullWidth size="xl" onClick={handleTossConfirm}>
                  <Zap size={20} /> Start Match
                </Button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </AppLayout>
    )
  }

  // MATCH COMPLETED SCREEN
  if (match.status === 'completed') {
    return (
      <AppLayout title="Match Over" backTo="/admin">
        <div className="page-container text-center pt-12 space-y-4">
          <div className="text-5xl">🏆</div>
          <h1 className="font-display font-bold text-2xl text-gold">Match Completed</h1>
          <p className="text-white">{match.result}</p>
        </div>
      </AppLayout>
    )
  }

  // ── LIVE UMPIRE UI ────────────────────────────────────────────────
  const battingTeamName = innings?.battingTeam === 'teamA' ? match.teamA?.name : match.teamB?.name
  const target = inningsIdx === 1 ? (match.innings?.[0]?.runs || 0) + 1 : null
  const currentBowlerHasBowled = Boolean(
    innings?.balls?.some(ball => ball.bowler === innings.currentBowler)
  )

  return (
    <AppLayout title="⚡ Umpire" backTo="/admin" hideNav>
      <div className="page-container pt-2 pb-6 space-y-3">

        {/* Mini scoreboard */}
        <motion.div
          className="bg-gradient-to-r from-midnight-300 to-midnight-200 border border-border rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/40 text-xs uppercase tracking-widest">{battingTeamName}</p>
            {target && <p className="text-gold text-xs font-semibold">Target: {target}</p>}
          </div>
          <div className="flex items-end justify-between">
            <motion.div
              key={`${innings.runs}-${innings.wickets}`}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.25 }}
              className="font-display font-black text-4xl text-white"
            >
              {innings.runs}
              <span className="text-white/40 text-2xl">/{innings.wickets}</span>
            </motion.div>
            <div className="text-right">
              <p className="text-white/60 text-base font-display font-bold">
                {formatOvers(innings.oversCompleted, innings.ballsInCurrentOver)} ov
              </p>
              <p className="text-white/30 text-xs">{match.overs} max</p>
            </div>
          </div>

          {/* This over */}
          <div className="flex gap-1.5 mt-3">
            {slots.map((b, i) => <BallDot key={i} ball={b} />)}
          </div>
        </motion.div>

        {/* Batsmen info */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { uid: innings.striker,    label: 'Striker *' },
            { uid: innings.nonStriker, label: 'Non-Striker' },
          ].filter(({ uid }) => uid).map(({ uid, label }) => {
            const bat = innings.batting?.[uid]
            return (
              <div key={uid} className="bg-midnight-100 border border-border rounded-xl p-3">
                <p className="text-white/30 text-[10px] uppercase">{label}</p>
                <p className="text-white font-bold text-sm truncate">{getPlayerName(uid)}</p>
                <p className="text-gold text-xs font-display">
                  {bat?.runs ?? 0}
                  <span className="text-white/30"> ({bat?.balls ?? 0}b)</span>
                </p>
                {(bat?.runs ?? 0) === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setBatsmanToReplace(uid === innings.striker ? 'striker' : 'nonStriker')
                      setShowBatsman(true)
                    }}
                    disabled={saving}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/50
                               hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil size={12} /> Change
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {innings.nonStriker && (
          <button
            type="button"
            onClick={handleSwapBatsmen}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-midnight-100
                       py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-gold hover:text-gold
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftRight size={16} /> Swap striker and non-striker
          </button>
        )}

        {/* Bowler */}
        {innings.currentBowler && (
          <div className="bg-midnight-100 border border-border rounded-xl px-3 py-2 flex justify-between items-center">
            <div>
              <p className="text-white/30 text-[10px] uppercase">Bowling</p>
              <p className="text-sapphire-light font-bold text-sm">{getPlayerName(innings.currentBowler)}</p>
              {!currentBowlerHasBowled && (
                <button
                  type="button"
                  onClick={() => setShowBowler(true)}
                  disabled={saving}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/50
                             hover:text-sapphire-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil size={12} /> Change
                </button>
              )}
            </div>
            {(() => {
              const bwl = innings.bowling?.[innings.currentBowler]
              return (
                <p className="font-display font-bold text-white text-sm">
                  {bwl?.wickets ?? 0}/{bwl?.runs ?? 0}
                  <span className="text-white/30 text-xs ml-1">
                    ({Math.floor((bwl?.balls ?? 0) / 6)}.{(bwl?.balls ?? 0) % 6})
                  </span>
                </p>
              )
            })()}
          </div>
        )}

        {/* Extra pending indicator */}
        <AnimatePresence>
          {pendingExtra && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2 flex items-center justify-between"
            >
              <p className="text-yellow-300 text-sm font-semibold">
                {pendingExtra.toUpperCase()} — now tap run count
              </p>
              <button onClick={cancelExtra} className="text-yellow-400/60 hover:text-yellow-400 text-xs">Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RUN BUTTONS ── */}
        <div className="grid grid-cols-3 gap-3">
          {RUN_BUTTONS.map(({ label, runs, color, size }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleRunButton(runs)}
              disabled={saving}
              className={`umpire-btn border-2 ${color} ${
                size === 'large' ? 'h-20 text-3xl col-span-1' : 'h-16 text-2xl'
              } disabled:opacity-40`}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* ── EXTRA BUTTONS ── */}
        <div className="grid grid-cols-4 gap-2">
          {EXTRA_BUTTONS.map(({ label, type, color }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleExtraButton(type)}
              disabled={saving}
              className={`umpire-btn border h-12 text-sm font-bold rounded-xl ${color} disabled:opacity-40`}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* ── WICKET + UNDO ── */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowWicket(true)}
            disabled={saving}
            className="umpire-btn border-2 h-16 text-xl font-black bg-danger/20 border-danger/60 text-danger
                       hover:bg-danger/30 disabled:opacity-40 rounded-2xl"
          >
            WICKET
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleUndo}
            disabled={saving || !innings?.balls?.length}
            className="umpire-btn border h-16 text-sm font-bold bg-midnight-300 border-border text-white/60
                       hover:text-white disabled:opacity-30 rounded-2xl flex-col gap-1"
          >
            <RotateCcw size={20} />
            <span className="text-xs">UNDO</span>
          </motion.button>
        </div>

        {/* End innings manually */}
        <Button
          fullWidth
          variant="ghost"
          size="sm"
          onClick={() => setShowEnd(true)}
          className="text-white/30 hover:text-white/60 mt-2"
        >
          End Innings Manually
        </Button>

        {/* Saving indicator */}
        {saving && (
          <div className="fixed top-16 right-4 z-50">
            <div className="bg-midnight-300 border border-border rounded-full px-3 py-1.5 flex items-center gap-2 text-xs text-white/60">
              <div className="w-3 h-3 border border-gold/40 border-t-gold rounded-full animate-spin" />
              Saving…
            </div>
          </div>
        )}

      </div>

      {/* ── WICKET MODAL ── */}
      <Modal isOpen={showWicket} onClose={() => setShowWicket(false)} title="Wicket" size="sm">
        <div className="space-y-4">
          {/* Dismissed batter */}
          <div>
            <p className="text-white/50 text-xs mb-2">Dismissed Batter</p>
            <div className="flex gap-2">
              {['striker', 'nonStriker'].filter(side => side === 'striker' || Boolean(innings?.nonStriker)).map(side => (
                <button
                  key={side}
                  onClick={() => setDismissedBatter(side)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    dismissedBatter === side
                      ? 'bg-danger text-white border-danger'
                      : 'bg-midnight-200 text-white/50 border-border'
                  }`}
                >
                  {getPlayerName(side === 'striker' ? innings?.striker : innings?.nonStriker)}
                  {side === 'striker' ? ' *' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Wicket type */}
          <div>
            <p className="text-white/50 text-xs mb-2">Dismissal Type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {WICKET_TYPES.map(wt => (
                <button
                  key={wt}
                  onClick={() => setWicketType(wt)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left ${
                    wicketType === wt
                      ? 'bg-danger/20 text-danger border-danger/50'
                      : 'bg-midnight-200 text-white/50 border-border hover:text-white'
                  }`}
                >
                  {wt}
                </button>
              ))}
            </div>
          </div>

          {/* Fielder */}
          {['Caught', 'Run Out', 'Stumped'].includes(wicketType) && (
            <div>
              <p className="text-white/50 text-xs mb-2">Fielder / Keeper</p>
              <select
                value={fielder}
                onChange={e => setFielder(e.target.value)}
                className="w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm
                           focus:outline-none focus:border-gold"
              >
                <option value="">Select fielder…</option>
                {(innings?.bowlingTeam === 'teamA' ? match.teamA?.playerIds : match.teamB?.playerIds || []).map(uid => (
                  <option key={uid} value={players[uid]?.name || uid}>{players[uid]?.name || uid}</option>
                ))}
              </select>
            </div>
          )}

          <Button fullWidth variant="danger" size="lg" onClick={handleWicketConfirm}>
            Confirm Wicket
          </Button>
        </div>
      </Modal>

      {/* ── SELECT BATSMAN MODAL ── */}
      <Modal
        isOpen={showBatsman}
        onClose={() => {
          setShowBatsman(false)
          setBatsmanToReplace('')
        }}
        title={batsmanToReplace ? 'Change Batsman' : 'New Batsman'}
      >
        <div className="space-y-2">
          <p className="text-white/40 text-xs mb-3">
            {batsmanToReplace ? 'Select a replacement who has not batted yet' : 'Select the incoming batsman'}
          </p>
          {(innings?.battingTeam === 'teamA' ? match.teamA?.playerIds : match.teamB?.playerIds || [])
            .filter(uid => {
              const bat = innings?.batting?.[uid]
              return !bat && uid !== innings?.striker && uid !== innings?.nonStriker
            })
            .map(uid => (
              <button
                key={uid}
                onClick={() => handleSelectBatsman(uid)}
                className="w-full flex items-center gap-3 bg-midnight-200 border border-border rounded-xl px-4 py-3
                           hover:border-gold hover:bg-midnight-300 transition-all text-left"
              >
                <Avatar name={players[uid]?.name} photoURL={players[uid]?.photoURL} size="sm" />
                <span className="text-white font-medium">{players[uid]?.name || uid}</span>
              </button>
            ))}
        </div>
      </Modal>

      {/* ── SELECT BOWLER MODAL ── */}
      <Modal
        isOpen={showBowler}
        onClose={() => setShowBowler(false)}
        title={currentBowlerHasBowled ? 'New Bowler' : 'Change Bowler'}
      >
        <div className="space-y-2">
          <p className="text-white/40 text-xs mb-3">
            {currentBowlerHasBowled ? 'Select bowler for next over' : 'Select a bowler before the first delivery'}
          </p>
          {(innings?.bowlingTeam === 'teamA' ? match.teamA?.playerIds : match.teamB?.playerIds || [])
            .map(uid => {
              const bwl = innings?.bowling?.[uid]
              return (
                <button
                  key={uid}
                  onClick={() => handleSelectBowler(uid)}
                  className="w-full flex items-center justify-between gap-3 bg-midnight-200 border border-border
                             rounded-xl px-4 py-3 hover:border-sapphire hover:bg-midnight-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={players[uid]?.name} photoURL={players[uid]?.photoURL} size="sm" />
                    <span className="text-white font-medium">{players[uid]?.name || uid}</span>
                  </div>
                  <span className="text-sapphire-light text-xs font-semibold">
                    {bwl?.wickets ?? 0}/{bwl?.runs ?? 0} ({Math.floor((bwl?.balls ?? 0) / 6)}.{(bwl?.balls ?? 0) % 6} ov)
                  </span>
                </button>
              )
            })}
        </div>
      </Modal>

      {/* ── END INNINGS MODAL ── */}
      <Modal isOpen={showEnd} onClose={() => setShowEnd(false)} title="End Innings">
        <div className="space-y-4 text-center">
          <p className="text-white/60 text-sm">
            {match.status === 'innings1'
              ? `${battingTeamName}: ${innings?.runs}/${innings?.wickets} (${innings?.oversCompleted}.${innings?.ballsInCurrentOver} ov)`
              : 'Ready to complete the match?'}
          </p>
          {match.status === 'innings1' && (
            <div className="grid grid-cols-2 gap-3 text-left">
              <label className="min-w-0">
                <span className="text-white/60 text-xs font-semibold">Opening striker</span>
                <select
                  value={innings2StrikerId}
                  onChange={event => setInnings2Striker(event.target.value)}
                  className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                >
                  {innings2BattingIds.length === 0 && <option value="">No players available</option>}
                  {innings2BattingIds.map(uid => (
                    <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-0">
                <span className="text-white/60 text-xs font-semibold">Opening non-striker</span>
                <select
                  value={innings2NonStrikerId}
                  onChange={event => setInnings2NonStriker(event.target.value)}
                  className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                >
                  {innings2BattingIds.filter(uid => uid !== innings2StrikerId).length === 0 && (
                    <option value="">No other batter available</option>
                  )}
                  {innings2BattingIds.filter(uid => uid !== innings2StrikerId).map(uid => (
                    <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-0 col-span-2">
                <span className="text-white/60 text-xs font-semibold">Opening bowler</span>
                <select
                  value={innings2BowlerId}
                  onChange={event => setInnings2Bowler(event.target.value)}
                  className="mt-1.5 w-full bg-midnight-100 border border-border rounded-xl px-3 py-2.5 text-white text-sm"
                >
                  {innings2BowlingIds.length === 0 && <option value="">No players available</option>}
                  {innings2BowlingIds.map(uid => (
                    <option key={uid} value={uid}>{getPlayerName(uid)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <Button fullWidth size="lg" onClick={handleEndInnings}>
            {match.status === 'innings1' ? 'Start 2nd Innings' : 'Complete Match 🏆'}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setShowEnd(false)}>
            Continue Playing
          </Button>
        </div>
      </Modal>
    </AppLayout>
  )
}
