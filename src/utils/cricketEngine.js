/**
 * cricketEngine.js
 * Pure scoring logic — no Firebase calls.
 * Takes the current innings state, returns the next innings state.
 */

export const DELIVERY_TYPES = {
  NORMAL: 'normal',
  WIDE:   'wide',
  NOBALL: 'noball',
  BYE:    'bye',
  LEGBYE: 'legbye',
}

export const WICKET_TYPES = [
  'Bowled',
  'Caught',
  'LBW',
  'Run Out',
  'Stumped',
  'Hit Wicket',
  'Obstructing the Field',
]

/**
 * Create an initial innings object.
 */
export function createInnings(battingTeam, bowlingTeam, striker, nonStriker, currentBowler) {
  return {
    battingTeam,
    bowlingTeam,
    runs: 0,
    wickets: 0,
    oversCompleted: 0,
    ballsInCurrentOver: 0, // legal balls (excludes wides/noballs)
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    striker,
    nonStriker,
    currentBowler,
    balls: [],         // full ball-by-ball log
    batting: {},       // uid → batting stats
    bowling: {},       // uid → bowling stats
  }
}

/**
 * Ensure batting/bowling records exist for players.
 */
function ensureBatting(innings, uid) {
  if (!innings.batting[uid]) {
    innings.batting[uid] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '', dismissedBy: '' }
  }
}

function ensureBowling(innings, uid) {
  if (!innings.bowling[uid]) {
    innings.bowling[uid] = { balls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 }
  }
}

/**
 * Main delivery processor.
 * Returns { innings, needsNewBatsman, needsNewBowler, isInningsOver, strikeChanged }
 */
export function processDelivery(innings, delivery) {
  // Deep clone to avoid mutation
  const inn = deepClone(innings)
  const {
    type = DELIVERY_TYPES.NORMAL,
    runs = 0,
    isWicket = false,
    wicketType = '',
    dismissedBatter = null,
    fielder = '',
  } = delivery

  const bowler  = inn.currentBowler
  const striker = inn.striker
  const ns      = inn.nonStriker

  ensureBatting(inn, striker)
  ensureBatting(inn, ns)
  ensureBowling(inn, bowler)

  const isLegal  = type === DELIVERY_TYPES.NORMAL || type === DELIVERY_TYPES.BYE || type === DELIVERY_TYPES.LEGBYE
  const isExtra  = type === DELIVERY_TYPES.WIDE   || type === DELIVERY_TYPES.NOBALL

  // ── Build ball record ─────────────────────────────────────────────
  const ballRecord = {
    id:            Date.now(),
    over:          inn.oversCompleted,
    ball:          inn.ballsInCurrentOver + 1,
    legalBall:     isLegal,
    type,
    runs,
    isWicket,
    wicketType,
    dismissedBatter,
    fielder,
    strikerBefore:    delivery.strikerBefore,
    nonStrikerBefore: delivery.nonStrikerBefore,
    bowlerBefore:     delivery.bowlerBefore,
    batsman:       striker,
    bowler,
    runningTotal:  inn.runs,
    runningWickets:inn.wickets,
    timestamp:     Date.now(),
  }

  // ── Update extras ────────────────────────────────────────────────
  if (type === DELIVERY_TYPES.WIDE) {
    inn.extras.wides  += 1 + runs
    inn.extras.total  += 1 + runs
    inn.runs          += 1 + runs
    inn.bowling[bowler].runs   += 1 + runs
    inn.bowling[bowler].wides  += 1
    ballRecord.totalRuns = 1 + runs
  } else if (type === DELIVERY_TYPES.NOBALL) {
    inn.extras.noBalls += 1
    inn.extras.total   += 1
    inn.runs           += 1 + runs
    inn.bowling[bowler].runs   += 1 + runs
    inn.bowling[bowler].noBalls += 1
    // Batter gets credit for runs off bat on no-ball
    inn.batting[striker].runs  += runs
    inn.batting[striker].balls += 0 // NB doesn't count against batter balls faced technically (but some formats count it)
    ballRecord.totalRuns = 1 + runs
  } else if (type === DELIVERY_TYPES.BYE) {
    inn.extras.byes   += runs
    inn.extras.total  += runs
    inn.runs          += runs
    inn.bowling[bowler].runs += 0 // byes don't count to bowler
    ballRecord.totalRuns = runs
  } else if (type === DELIVERY_TYPES.LEGBYE) {
    inn.extras.legByes += runs
    inn.extras.total   += runs
    inn.runs           += runs
    inn.bowling[bowler].runs += 0 // leg byes don't count to bowler
    ballRecord.totalRuns = runs
  } else {
    // Normal delivery
    inn.runs                   += runs
    inn.batting[striker].runs  += runs
    inn.batting[striker].balls += 1
    inn.bowling[bowler].runs   += runs
    if (runs === 4) inn.batting[striker].fours += 1
    if (runs === 6) inn.batting[striker].sixes += 1
    ballRecord.totalRuns = runs
  }

  // ── Wicket ───────────────────────────────────────────────────────
  let needsNewBatsman = false
  if (isWicket) {
    inn.wickets += 1
    const out = dismissedBatter || striker
    ensureBatting(inn, out)
    inn.batting[out].isOut    = true
    inn.batting[out].dismissal = `${wicketType}${fielder ? ` (${fielder})` : ''}`

    // Only caught/stumped/run-out don't credit bowler with wicket
    const bowlerWicket = !['Run Out', 'Obstructing the Field'].includes(wicketType)
    if (bowlerWicket) inn.bowling[bowler].wickets += 1

    if (type === DELIVERY_TYPES.NORMAL || type === DELIVERY_TYPES.NOBALL) {
      inn.batting[striker].balls += (type === DELIVERY_TYPES.NORMAL ? 0 : 0) // already counted above for normal
    }
    needsNewBatsman = true
    ballRecord.isWicket     = true
    ballRecord.wicketType   = wicketType
    ballRecord.dismissedBatter = out
  }

  // ── Count legal balls / overs ─────────────────────────────────────
  let needsNewBowler   = false
  let isInningsOver    = false
  let strikeChanged    = false

  if (isLegal) {
    inn.ballsInCurrentOver += 1
    inn.bowling[bowler].balls += 1

    if (inn.ballsInCurrentOver === 6) {
      // Over complete
      inn.oversCompleted    += 1
      inn.ballsInCurrentOver = 0
      needsNewBowler         = true
      // Strike rotates at end of over
      if (!isWicket || (isWicket && dismissedBatter === inn.nonStriker)) {
        const tmp      = inn.striker
        inn.striker    = inn.nonStriker
        inn.nonStriker = tmp
        strikeChanged  = true
      }
      // Check maiden
      const overBalls = inn.balls.filter(b => b.over === inn.oversCompleted - 1 && b.bowler === bowler)
      const overRuns  = overBalls.reduce((s, b) => s + (b.totalRuns || 0), 0)
      if (overRuns === 0) inn.bowling[bowler].maidens += 1
    } else {
      // Strike rotates on odd runs (1, 3)
      if (!isWicket) {
        const totalDeliveryRuns = ballRecord.totalRuns
        if (totalDeliveryRuns % 2 === 1) {
          const tmp      = inn.striker
          inn.striker    = inn.nonStriker
          inn.nonStriker = tmp
          strikeChanged  = true
        }
      }
    }
  } else {
    // Extras (wide/no-ball) — only rotate strike on odd runs from extras
    const extRuns = type === DELIVERY_TYPES.WIDE ? runs : runs
    if (extRuns % 2 === 1) {
      const tmp      = inn.striker
      inn.striker    = inn.nonStriker
      inn.nonStriker = tmp
      strikeChanged  = true
    }
  }

  // ── Push ball record ─────────────────────────────────────────────
  ballRecord.runningTotal   = inn.runs
  ballRecord.runningWickets = inn.wickets
  inn.balls.push(ballRecord)

  // ── Innings over? ─────────────────────────────────────────────────
  // Will be checked by caller based on maxWickets and overs
  return { innings: inn, needsNewBatsman, needsNewBowler, isInningsOver, strikeChanged }
}

/**
 * Undo last legal delivery (pops last ball and recalculates).
 * Returns rebuilt innings.
 */
export function undoLastBall(originalInnings) {
  const inn = deepClone(originalInnings)
  if (inn.balls.length === 0) return inn

  // Remove last ball
  const removed = inn.balls.pop()

  // Rebuild totals from scratch
  return rebuildInnings(inn, removed)
}

/**
 * Rebuild innings totals from the balls array.
 * Used after undo.
 */
function rebuildInnings(inn, removedBall) {
  inn.runs = 0
  inn.wickets = 0
  inn.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }
  inn.batting = {}
  inn.bowling = {}

  for (const b of inn.balls) {
    ensureBatting(inn, b.batsman)
    ensureBowling(inn, b.bowler)

    inn.runs += b.totalRuns ?? b.runs ?? 0
    if (b.isWicket) inn.wickets += 1

    if (b.type === DELIVERY_TYPES.NORMAL) {
      inn.batting[b.batsman].balls += 1
      inn.batting[b.batsman].runs  += b.runs || 0
      if ((b.runs || 0) === 4) inn.batting[b.batsman].fours += 1
      if ((b.runs || 0) === 6) inn.batting[b.batsman].sixes += 1
      inn.bowling[b.bowler].balls += 1
      inn.bowling[b.bowler].runs  += b.runs || 0
    } else if (b.type === DELIVERY_TYPES.NOBALL) {
      inn.extras.noBalls += 1
      inn.extras.total += 1
      inn.batting[b.batsman].runs  += b.runs || 0
      inn.bowling[b.bowler].runs   += 1 + (b.runs || 0)
      inn.bowling[b.bowler].noBalls += 1
    } else if (b.type === DELIVERY_TYPES.WIDE) {
      inn.extras.wides += 1 + (b.runs || 0)
      inn.extras.total += 1 + (b.runs || 0)
      inn.bowling[b.bowler].runs  += 1 + (b.runs || 0)
      inn.bowling[b.bowler].wides += 1
    } else if (b.type === DELIVERY_TYPES.BYE) {
      inn.extras.byes += b.runs || 0
      inn.extras.total += b.runs || 0
      inn.bowling[b.bowler].balls += 1
    } else if (b.type === DELIVERY_TYPES.LEGBYE) {
      inn.extras.legByes += b.runs || 0
      inn.extras.total += b.runs || 0
      inn.bowling[b.bowler].balls += 1
    }

    if (b.isWicket) {
      const bowlerWicket = !['Run Out', 'Obstructing the Field'].includes(b.wicketType)
      if (bowlerWicket) inn.bowling[b.bowler].wickets += 1
      if (b.dismissedBatter) {
        ensureBatting(inn, b.dismissedBatter)
        inn.batting[b.dismissedBatter].isOut     = true
        inn.batting[b.dismissedBatter].dismissal = `${b.wicketType}${b.fielder ? ` (${b.fielder})` : ''}`
      }
    }
  }

  const totalLegal = inn.balls.filter(b => b.legalBall).length
  inn.oversCompleted = Math.floor(totalLegal / 6)
  inn.ballsInCurrentOver = totalLegal % 6

  const completedOvers = new Map()
  for (const ball of inn.balls) {
    if (!ball.legalBall) continue
    const key = `${ball.over}:${ball.bowler}`
    const over = completedOvers.get(key) || { balls: 0, runs: 0 }
    over.balls += 1
    if (ball.type !== DELIVERY_TYPES.BYE && ball.type !== DELIVERY_TYPES.LEGBYE) {
      over.runs += ball.type === DELIVERY_TYPES.WIDE
        ? 1 + (ball.runs || 0)
        : ball.type === DELIVERY_TYPES.NOBALL ? 1 + (ball.runs || 0) : (ball.runs || 0)
    }
    completedOvers.set(key, over)
  }
  for (const [key, over] of completedOvers) {
    const bowler = key.slice(key.indexOf(':') + 1)
    if (over.balls === 6 && over.runs === 0) inn.bowling[bowler].maidens += 1
  }

  if (removedBall.strikerBefore !== undefined) inn.striker = removedBall.strikerBefore
  if (removedBall.nonStrikerBefore !== undefined) inn.nonStriker = removedBall.nonStrikerBefore
  if (removedBall.bowlerBefore !== undefined) inn.currentBowler = removedBall.bowlerBefore

  return inn
}

/**
 * Check if innings is complete.
 */
export function isInningsComplete(innings, maxOvers, maxWickets = 10) {
  return (
    innings.wickets >= maxWickets ||
    (innings.oversCompleted >= maxOvers && innings.ballsInCurrentOver === 0)
  )
}

export function getChaseWinResult(innings, target, battingTeamName, maxWickets = 10) {
  if (!Number.isFinite(target) || innings.runs < target) return null
  const wicketsLeft = Math.max(0, maxWickets - innings.wickets)
  return `${battingTeamName} won by ${wicketsLeft} wickets`
}

export function getMatchResult(firstInnings, secondInnings, teamAName, teamBName) {
  const firstTeamName = firstInnings.battingTeam === 'teamA' ? teamAName : teamBName
  const secondTeamName = secondInnings.battingTeam === 'teamA' ? teamAName : teamBName

  if (secondInnings.runs > firstInnings.runs) {
    return `${secondTeamName} won by ${10 - secondInnings.wickets} wickets`
  }
  if (firstInnings.runs > secondInnings.runs) {
    return `${firstTeamName} won by ${firstInnings.runs - secondInnings.runs} runs`
  }
  return 'Match tied!'
}

/**
 * Format overs: 2.3 means 2 overs 3 balls.
 */
export function formatOvers(oversCompleted, ballsInCurrentOver) {
  return `${oversCompleted}.${ballsInCurrentOver}`
}

/**
 * Calculate strike rate.
 */
export function strikeRate(runs, balls) {
  if (!balls) return '0.00'
  return ((runs / balls) * 100).toFixed(1)
}

/**
 * Calculate economy rate.
 */
export function economy(runs, balls) {
  if (!balls) return '0.00'
  const overs = balls / 6
  return (runs / overs).toFixed(2)
}

/**
 * Get current over balls for display (last up to 6 legal balls).
 */
export function getCurrentOverBalls(innings) {
  const currentOver = innings.oversCompleted
  return innings.balls
    .filter(b => b.over === currentOver)
    .slice(-6)
}

/**
 * Deep clone helper.
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

