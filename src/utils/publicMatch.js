export const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateMatchShareCode() {
  const values = new Uint8Array(12)
  crypto.getRandomValues(values)
  return Array.from(values, value => SHARE_CODE_ALPHABET[value % SHARE_CODE_ALPHABET.length]).join('')
}

export function createPublicMatchView(match, matchId, playerNames = {}) {
  const publicIds = new Map()
  const publicNames = {}
  const publicId = uid => {
    if (!uid) return uid
    if (!publicIds.has(uid)) {
      const id = `p${publicIds.size + 1}`
      publicIds.set(uid, id)
      publicNames[id] = playerNames[uid] || match.teamA?.playerNames?.[uid] || match.teamB?.playerNames?.[uid] || 'Player'
    }
    return publicIds.get(uid)
  }

  for (const uid of [...(match.teamA?.playerIds || []), ...(match.teamB?.playerIds || [])]) publicId(uid)
  for (const innings of match.innings || []) {
    for (const uid of Object.keys(innings.batting || {})) publicId(uid)
    for (const uid of Object.keys(innings.bowling || {})) publicId(uid)
    for (const uid of [innings.striker, innings.nonStriker, innings.currentBowler]) publicId(uid)
    for (const ball of innings.balls || []) {
      for (const uid of [ball.strikerBefore, ball.nonStrikerBefore, ball.bowlerBefore, ball.batsman, ball.bowler, ball.dismissedBatter, ball.fielder]) publicId(uid)
    }
  }

  const publicTeam = team => ({
    name: team?.name || 'Team',
    playerIds: (team?.playerIds || []).map(publicId),
    playerNames: Object.fromEntries(
      (team?.playerIds || []).map(uid => [publicId(uid), publicNames[publicId(uid)]])
    ),
  })
  const publicInnings = (innings = []) => innings.map(item => ({
    ...item,
    striker: publicId(item.striker),
    nonStriker: publicId(item.nonStriker),
    currentBowler: publicId(item.currentBowler),
    batting: Object.fromEntries(Object.entries(item.batting || {}).map(([uid, stats]) => [
      publicId(uid),
      { ...stats, dismissal: stats.dismissal?.replace(/\s+\([^)]*\)$/, '') || '' },
    ])),
    bowling: Object.fromEntries(Object.entries(item.bowling || {}).map(([uid, stats]) => [publicId(uid), stats])),
    balls: (item.balls || []).map(ball => ({
      ...ball,
      strikerBefore: publicId(ball.strikerBefore),
      nonStrikerBefore: publicId(ball.nonStrikerBefore),
      bowlerBefore: publicId(ball.bowlerBefore),
      batsman: publicId(ball.batsman),
      bowler: publicId(ball.bowler),
      dismissedBatter: publicId(ball.dismissedBatter),
      fielder: publicId(ball.fielder),
    })),
  }))

  return {
    matchId,
    title: match.title || 'Live match',
    venue: match.venue || 'TBD',
    overs: Number(match.overs) || 0,
    status: match.status || 'scheduled',
    teamA: publicTeam(match.teamA),
    teamB: publicTeam(match.teamB),
    innings: publicInnings(match.innings),
    toss: match.toss || null,
    result: match.result || null,
  }
}
