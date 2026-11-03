import { formatOvers } from '../utils/cricketEngine'

function getPlayerName(players, uid) {
  return players[uid]?.name || uid?.slice(0, 8) || 'Unknown'
}

function getMatchSummary(match, players) {
  const teamScores = { teamA: [], teamB: [] }
  const batters = {}
  const bowlers = {}

  for (const innings of match.innings || []) {
    if (teamScores[innings.battingTeam]) {
      teamScores[innings.battingTeam].push(innings)
    }

    for (const [uid, batting] of Object.entries(innings.batting || {})) {
      const current = batters[uid] || { runs: 0, balls: 0 }
      current.runs += batting.runs || 0
      current.balls += batting.balls || 0
      batters[uid] = current
    }

    for (const [uid, bowling] of Object.entries(innings.bowling || {})) {
      const current = bowlers[uid] || { wickets: 0, runs: 0, balls: 0 }
      current.wickets += bowling.wickets || 0
      current.runs += bowling.runs || 0
      current.balls += bowling.balls || 0
      bowlers[uid] = current
    }
  }

  const totalRuns = team => teamScores[team].reduce((sum, innings) => sum + (innings.runs || 0), 0)
  const runsA = totalRuns('teamA')
  const runsB = totalRuns('teamB')
  const winner = teamScores.teamA.length && teamScores.teamB.length
    ? runsA === runsB ? null : runsA > runsB ? 'teamA' : 'teamB'
    : null
  const topBatters = Object.entries(batters)
    .map(([uid, stats]) => ({ uid, ...stats }))
    .filter(player => player.runs > 0 || player.balls > 0)
    .sort((a, b) => b.runs - a.runs || a.balls - b.balls)
    .slice(0, 2)
  const topBowlers = Object.entries(bowlers)
    .map(([uid, stats]) => ({ uid, ...stats }))
    .filter(player => player.wickets > 0 || player.runs > 0 || player.balls > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs || b.balls - a.balls)
    .slice(0, 2)

  return { teamScores, winner, topBatters, topBowlers }
}

export default function CompletedMatchSummary({ match, players = {}, compact = false }) {
  const { teamScores, winner, topBatters, topBowlers } = getMatchSummary(match, players)
  const teams = [
    { key: 'teamA', name: match.teamA?.name || 'Team A' },
    { key: 'teamB', name: match.teamB?.name || 'Team B' },
  ]

  return (
    <div className={`mt-3 border-t border-border/50 ${compact ? 'pt-3' : 'pt-4'} space-y-3`}>
      <div className="space-y-2">
        {teams.map(team => (
          <div
            key={team.key}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
              winner === team.key ? 'bg-gold/10 border border-gold/30' : 'bg-midnight-200/70'
            }`}
          >
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${winner === team.key ? 'text-gold' : 'text-white/75'}`}>
                {team.name}{winner === team.key ? ' · Winner' : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {teamScores[team.key].length ? teamScores[team.key].map((innings, index) => (
                <p key={`${team.key}-${index}`} className="font-display font-bold text-white">
                  {innings.runs || 0}/{innings.wickets || 0}
                  <span className="ml-1 text-xs font-normal text-white/40">
                    ({formatOvers(innings.oversCompleted || 0, innings.ballsInCurrentOver || 0)} ov)
                  </span>
                </p>
              )) : <span className="text-sm text-white/30">No score</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Top batters</p>
          {topBatters.length ? topBatters.map(player => (
            <p key={player.uid} className="truncate text-xs text-white/75">
              {getPlayerName(players, player.uid)}
              <span className="ml-1 font-semibold text-gold">{player.runs}</span>
              <span className="text-white/35"> ({player.balls}b)</span>
            </p>
          )) : <p className="text-xs text-white/30">No batting stats</p>}
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Top bowlers</p>
          {topBowlers.length ? topBowlers.map(player => (
            <p key={player.uid} className="truncate text-xs text-white/75">
              {getPlayerName(players, player.uid)}
              <span className="ml-1 font-semibold text-sapphire-light">
                {player.wickets}/{player.runs}
              </span>
              <span className="text-white/35">
                {' '}({formatOvers(Math.floor(player.balls / 6), player.balls % 6)})
              </span>
            </p>
          )) : <p className="text-xs text-white/30">No bowling stats</p>}
        </div>
      </div>

      {match.result && (
        <p className="text-xs font-semibold text-gold">{match.result}</p>
      )}
    </div>
  )
}
