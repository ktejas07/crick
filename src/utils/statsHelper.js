import { strikeRate, economy } from './cricketEngine.js'

export function getPlayerMatchStats(matches, playerId, includeLive = false) {
  const eligibleStatuses = includeLive
    ? new Set(['completed', 'innings1', 'innings2'])
    : new Set(['completed'])

  return matches
    .filter(match => eligibleStatuses.has(match.status) && (
      match.teamA?.playerIds?.includes(playerId) || match.teamB?.playerIds?.includes(playerId)
    ))
    .map(match => {
      let batting = null
      let bowling = null

      for (const innings of match.innings || []) {
        const inningsBatting = innings.batting?.[playerId]
        if (inningsBatting) {
          batting ||= { runs: 0, balls: 0, fours: 0, sixes: 0, highScore: 0, isOut: false, dismissal: '' }
          batting.runs += inningsBatting.runs || 0
          batting.balls += inningsBatting.balls || 0
          batting.fours += inningsBatting.fours || 0
          batting.sixes += inningsBatting.sixes || 0
          batting.highScore = Math.max(batting.highScore, inningsBatting.runs || 0)
          batting.isOut ||= Boolean(inningsBatting.isOut)
          if (inningsBatting.dismissal) batting.dismissal = inningsBatting.dismissal
        }

        const inningsBowling = innings.bowling?.[playerId]
        if (inningsBowling) {
          bowling ||= { balls: 0, runs: 0, wickets: 0, maidens: 0 }
          bowling.balls += inningsBowling.balls || 0
          bowling.runs += inningsBowling.runs || 0
          bowling.wickets += inningsBowling.wickets || 0
          bowling.maidens += inningsBowling.maidens || 0
        }
      }

      return {
        matchId: match.id,
        matchTitle: match.title,
        date: match.createdAt,
        batting,
        bowling,
      }
    })
}

/**
 * Aggregate player stats across multiple matches.
 * @param {Array} matchStatsList — array of playerMatchStat objects
 */
export function aggregatePlayerStats(matchStatsList) {
  const agg = {
    totalMatches:  0,
    batting: {
      innings:   0,
      runs:      0,
      balls:     0,
      fours:     0,
      sixes:     0,
      highScore: 0,
      notOuts:   0,
      average:   '-',
      strikeRate: '-',
    },
    bowling: {
      innings:   0,
      overs:     0,
      balls:     0,
      runs:      0,
      wickets:   0,
      maidens:   0,
      average:   '-',
      economy:   '-',
      bestFigures: '-',
    },
  }

  const seenMatchIds = new Set()
  for (const stat of matchStatsList) {
    if (!stat.matchId || !seenMatchIds.has(stat.matchId)) {
      agg.totalMatches += 1
      if (stat.matchId) seenMatchIds.add(stat.matchId)
    }

    const b = stat.batting
    if (b && b.balls > 0) {
      agg.batting.innings   += 1
      agg.batting.runs      += b.runs   || 0
      agg.batting.balls     += b.balls  || 0
      agg.batting.fours     += b.fours  || 0
      agg.batting.sixes     += b.sixes  || 0
      if (!b.isOut) agg.batting.notOuts += 1
      const highScore = b.highScore ?? b.runs ?? 0
      if (highScore > agg.batting.highScore) {
        agg.batting.highScore = highScore
      }
    }

    const bw = stat.bowling
    if (bw && (bw.balls > 0 || bw.runs > 0 || bw.wickets > 0)) {
      agg.bowling.innings  += 1
      agg.bowling.balls    += bw.balls   || 0
      agg.bowling.runs     += bw.runs    || 0
      agg.bowling.wickets  += bw.wickets || 0
      agg.bowling.maidens  += bw.maidens || 0

      // Best bowling figures
      const current = parseFigures(agg.bowling.bestFigures)
      if (
        (bw.wickets || 0) > current.wickets ||
        ((bw.wickets || 0) === current.wickets && (bw.runs || 0) < current.runs)
      ) {
        agg.bowling.bestFigures = `${bw.wickets}/${bw.runs}`
      }
    }
  }

  // Calculate derived stats
  const dismissals = agg.batting.innings - agg.batting.notOuts
  agg.batting.average    = dismissals > 0 ? (agg.batting.runs / dismissals).toFixed(1) : '-'
  agg.batting.strikeRate = agg.batting.balls > 0
    ? strikeRate(agg.batting.runs, agg.batting.balls)
    : '-'

  agg.bowling.overs   = Math.floor(agg.bowling.balls / 6)
  agg.bowling.economy = agg.bowling.balls > 0
    ? economy(agg.bowling.runs, agg.bowling.balls)
    : '-'
  agg.bowling.average = agg.bowling.wickets > 0
    ? (agg.bowling.runs / agg.bowling.wickets).toFixed(1)
    : '-'

  return agg
}

function parseFigures(str) {
  if (!str || str === '-') return { wickets: -1, runs: 9999 }
  const [w, r] = str.split('/').map(Number)
  return { wickets: w || 0, runs: r || 9999 }
}

/**
 * Format match duration from overs.
 */
export function formatMatchOvers(overs) {
  return `${overs} ov`
}

/**
 * Get a player's batting stats from an innings.
 */
export function getPlayerBatting(innings, uid) {
  return innings?.batting?.[uid] || null
}

/**
 * Get a player's bowling stats from an innings.
 */
export function getPlayerBowling(innings, uid) {
  return innings?.bowling?.[uid] || null
}

/**
 * Derive required run rate.
 */
export function requiredRunRate(target, currentRuns, ballsLeft) {
  const needed = target - currentRuns
  if (needed <= 0) return '0.00'
  if (ballsLeft <= 0) return '∞'
  return ((needed / ballsLeft) * 6).toFixed(2)
}

/**
 * Derive current run rate.
 */
export function currentRunRate(runs, balls) {
  if (!balls) return '0.00'
  return ((runs / balls) * 6).toFixed(2)
}

