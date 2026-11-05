const NON_BOWLER_WICKET_TYPES = new Set(['Run Out', 'Obstructing the Field'])

function getParticipants(match) {
  return [...new Set([
    ...(match.teamA?.playerIds || []),
    ...(match.teamB?.playerIds || []),
  ])]
}

function getPlayerName(players, uid) {
  return players[uid]?.name || 'A player'
}

function getTeamName(match, team) {
  return match[team]?.name || (team === 'teamA' ? 'Team A' : 'Team B')
}

function makeNotification(id, type, title, message, matchId, recipients) {
  return { id, type, title, message, matchId, recipients }
}

export function getMatchNotifications(previousMatch, nextMatch, matchId, players) {
  const recipients = getParticipants(nextMatch)
  if (!recipients.length) return []

  const events = []
  const previousInnings = previousMatch.innings || []
  const nextInnings = nextMatch.innings || []

  nextInnings.forEach((innings, inningsIndex) => {
    const previous = previousInnings[inningsIndex] || { balls: [], batting: {}, bowling: {}, runs: 0 }
    const previousBallCount = previous.balls?.length || 0
    const newBalls = (innings.balls || []).slice(previousBallCount)
    if (!newBalls.length) return

    const battingTeamName = getTeamName(nextMatch, innings.battingTeam)
    const bowlingTeamName = getTeamName(nextMatch, innings.bowlingTeam)
    const ballHistory = innings.balls || []
    const previousRuns = previous.runs || 0
    if (previousRuns <= 80 && (innings.runs || 0) > 80) {
      events.push(makeNotification(
        `match-${matchId}-innings-${inningsIndex}-score-80`,
        'score',
        'A big innings is building',
        `${battingTeamName} passed 80 runs.`,
        matchId,
        recipients,
      ))
    }

    for (const [uid, stats] of Object.entries(innings.batting || {})) {
      const oldRuns = previous.batting?.[uid]?.runs || 0
      for (const milestone of [50, 100]) {
        if (oldRuns < milestone && (stats.runs || 0) >= milestone) {
          const label = milestone === 50 ? 'Half-century' : 'Century'
          events.push(makeNotification(
            `match-${matchId}-innings-${inningsIndex}-batter-${uid}-${milestone}`,
            'milestone',
            `${label}!`,
            `${getPlayerName(players, uid)} scored ${milestone} for ${battingTeamName}.`,
            matchId,
            recipients,
          ))
        }
      }

      const lastThree = ballHistory.slice(-3)
      if (lastThree.length === 3 && lastThree.every(ball =>
        ball.batsman === uid
        && ball.runs === 6
        && (ball.type === 'normal' || ball.type === 'noball')
      )) {
        events.push(makeNotification(
          `match-${matchId}-innings-${inningsIndex}-sixes-${uid}`,
          'sixes',
          'Three sixes in a row!',
          `${getPlayerName(players, uid)} cleared the rope three balls running.`,
          matchId,
          recipients,
        ))
      }
    }

    const lastThreeBalls = ballHistory.slice(-3)
    if (
      lastThreeBalls.length === 3
      && lastThreeBalls.every(ball =>
        ball.bowler === lastThreeBalls[0].bowler
        && ball.isWicket
        && !NON_BOWLER_WICKET_TYPES.has(ball.wicketType)
      )
    ) {
      const bowlerId = lastThreeBalls[0].bowler
      events.push(makeNotification(
        `match-${matchId}-innings-${inningsIndex}-hat-trick-${bowlerId}`,
        'hat-trick',
        'Bowling hat-trick!',
        `${getPlayerName(players, bowlerId)} took three wickets in a row for ${bowlingTeamName}.`,
        matchId,
        recipients,
      ))
    }

    for (const [uid, stats] of Object.entries(innings.bowling || {})) {
      const oldMaidens = previous.bowling?.[uid]?.maidens || 0
      const newMaidens = stats.maidens || 0
      if (newMaidens > oldMaidens) {
        events.push(makeNotification(
          `match-${matchId}-innings-${inningsIndex}-maiden-${uid}-${newMaidens}`,
          'maiden',
          'A maiden over',
          `${getPlayerName(players, uid)} bowled a maiden for ${bowlingTeamName}.`,
          matchId,
          recipients,
        ))
      }
    }
  })

  if (previousMatch.status !== 'completed' && nextMatch.status === 'completed') {
    const totals = { teamA: 0, teamB: 0 }
    for (const innings of nextInnings) {
      if (innings.battingTeam in totals) totals[innings.battingTeam] += innings.runs || 0
    }

    const winningTeam = totals.teamA === totals.teamB
      ? null
      : totals.teamA > totals.teamB ? 'teamA' : 'teamB'

    for (const team of ['teamA', 'teamB']) {
      const teamRecipients = nextMatch[team]?.playerIds || []
      if (!teamRecipients.length) continue
      const teamName = getTeamName(nextMatch, team)
      const isWinner = team === winningTeam
      const title = winningTeam ? (isWinner ? 'Victory!' : 'Match complete') : 'Match tied'
      const message = winningTeam
        ? (isWinner
          ? nextMatch.result || `${teamName} won.`
          : `${teamName} lost. ${nextMatch.result || 'The match is complete.'}`)
        : `${teamName} finished level with ${getTeamName(nextMatch, team === 'teamA' ? 'teamB' : 'teamA')}.`

      events.push(makeNotification(
        `match-${matchId}-completed-${team}`,
        winningTeam ? (isWinner ? 'victory' : 'result') : 'result',
        title,
        message,
        matchId,
        teamRecipients,
      ))
    }
  }

  return events
}
