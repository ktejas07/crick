import { Link } from 'react-router-dom'
import Card from './ui/Card'
import BallFeed from './BallFeed'
import { formatOvers, strikeRate, economy } from '../utils/cricketEngine'

function playerName(players, uid) {
  return players[uid]?.name || uid?.slice(0, 8) || 'Unknown'
}

function oversFromBalls(balls) {
  return formatOvers(Math.floor(balls / 6), balls % 6)
}

function getBattingOrder(innings, battingIds) {
  const recordedIds = Object.keys(innings.batting || {})
  return [...new Set([...battingIds, ...recordedIds])]
}

function getBowlingOrder(innings, bowlingIds) {
  const recordedIds = Object.keys(innings.bowling || {})
  return [...new Set([...bowlingIds, ...recordedIds])]
}

function Extras({ extras = {} }) {
  const total = extras.total ?? (
    (extras.wides || 0) + (extras.noBalls || 0) + (extras.byes || 0) + (extras.legByes || 0)
  )

  return (
    <div className="flex items-start justify-between gap-3 border-t border-border/50 px-3 py-2 text-xs">
      <span className="text-white/50">Extras</span>
      <span className="text-right text-white/75">
        {total} (b {extras.byes || 0}, lb {extras.legByes || 0}, w {extras.wides || 0}, nb {extras.noBalls || 0})
      </span>
    </div>
  )
}

export default function InningsScorecard({ innings, index, match, players }) {
  if (!innings) return null

  const battingTeamKey = innings.battingTeam
  const bowlingTeamKey = innings.bowlingTeam
    || (battingTeamKey === 'teamA' ? 'teamB' : 'teamA')
  const battingTeam = match[battingTeamKey]
  const bowlingTeam = match[bowlingTeamKey]
  const battingIds = battingTeam?.playerIds || []
  const bowlingIds = bowlingTeam?.playerIds || []
  const batters = getBattingOrder(innings, battingIds)
  const bowlers = getBowlingOrder(innings, bowlingIds)
  const totalBalls = (innings.oversCompleted || 0) * 6 + (innings.ballsInCurrentOver || 0)
  const overs = oversFromBalls(totalBalls)
  const runRate = totalBalls > 0
    ? ((innings.runs / totalBalls) * 6).toFixed(2)
    : '0.00'

  return (
    <Card animate={false} className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Innings {index + 1}
          </p>
          <h3 className="font-display font-bold text-white">{battingTeam?.name || 'Batting team'}</h3>
        </div>
        <div className="text-right">
          <p className="font-display font-black text-xl text-white">
            {innings.runs || 0}/{innings.wickets || 0}
          </p>
          <p className="text-xs text-white/40">
            {overs} ov
            {' · '}RR {runRate}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">Batting</p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <div className="min-w-[420px]">
            <div className="grid grid-cols-[minmax(130px,1fr)_36px_42px_32px_32px_48px] gap-1 bg-midnight-100 px-3 py-2 text-right text-[10px] font-semibold text-white/40">
              <span className="text-left">Batter</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span>
            </div>
            {batters.map(uid => {
              const stats = innings.batting?.[uid]
              return (
                <div key={uid} className="grid grid-cols-[minmax(130px,1fr)_36px_42px_32px_32px_48px] gap-1 border-t border-border/40 px-3 py-2 text-right text-xs">
                  <div className="min-w-0 text-left">
                    <Link to={`/player/${uid}`} className="block truncate font-medium text-white hover:text-gold">
                      {playerName(players, uid)}
                    </Link>
                    <span className="block truncate text-[10px] text-white/35">
                      {stats?.isOut ? (stats.dismissal || 'Out') : stats ? 'Not out' : 'Did not bat'}
                    </span>
                  </div>
                  <span className="font-semibold text-white">{stats?.runs ?? '-'}</span>
                  <span className="text-white/65">{stats?.balls ?? '-'}</span>
                  <span className="text-white/65">{stats?.fours ?? '-'}</span>
                  <span className="text-white/65">{stats?.sixes ?? '-'}</span>
                  <span className="text-white/65">
                    {stats?.balls ? strikeRate(stats.runs || 0, stats.balls) : '-'}
                  </span>
                </div>
              )
            })}
            <Extras extras={innings.extras} />
            <div className="flex justify-between border-t border-border/60 bg-midnight-100 px-3 py-2 text-xs font-bold text-white">
              <span>Total</span>
              <span>
                {innings.runs || 0}/{innings.wickets || 0}
                <span className="font-normal text-white/40"> ({overs} ov)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">Bowling · {bowlingTeam?.name || 'Bowling team'}</p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <div className="min-w-[370px]">
            <div className="grid grid-cols-[minmax(120px,1fr)_48px_32px_42px_40px_48px] gap-1 bg-midnight-100 px-3 py-2 text-right text-[10px] font-semibold text-white/40">
              <span className="text-left">Bowler</span><span>O</span><span>M</span><span>R</span><span>W</span><span>ECON</span>
            </div>
            {bowlers.map(uid => {
              const stats = innings.bowling?.[uid] || {}
              const balls = stats.balls || 0
              return (
                <div key={uid} className="grid grid-cols-[minmax(120px,1fr)_48px_32px_42px_40px_48px] gap-1 border-t border-border/40 px-3 py-2 text-right text-xs">
                  <Link to={`/player/${uid}`} className="truncate text-left font-medium text-white hover:text-gold">
                    {playerName(players, uid)}
                  </Link>
                  <span className="text-white/65">{oversFromBalls(balls)}</span>
                  <span className="text-white/65">{stats.maidens || 0}</span>
                  <span className="text-white/65">{stats.runs || 0}</span>
                  <span className="font-semibold text-white">{stats.wickets || 0}</span>
                  <span className="text-white/65">{balls ? economy(stats.runs || 0, balls) : '-'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {innings.balls?.length > 0 && (
        <BallFeed innings={innings} players={players} showAll />
      )}
    </Card>
  )
}
