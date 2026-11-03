function clamp(value) {
  return Math.max(0, Math.min(10, value))
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function getPlayerRating(stats) {
  const batting = stats?.batting
  const bowling = stats?.bowling
  const components = []

  if (batting?.innings > 0 && batting.balls > 0) {
    const dismissals = Math.max(0, batting.innings - (batting.notOuts || 0))
    const average = dismissals > 0
      ? numberOrZero(batting.runs) / dismissals
      : numberOrZero(batting.runs) / batting.innings
    const strikeRate = numberOrZero(batting.runs) / batting.balls * 100
    const battingRating = (
      clamp(average / 30 * 10) +
      clamp(strikeRate / 150 * 10)
    ) / 2
    components.push(battingRating)
  }

  if (bowling?.innings > 0 && bowling.balls > 0) {
    const wicketsPerInnings = numberOrZero(bowling.wickets) / bowling.innings
    const economy = numberOrZero(bowling.runs) / bowling.balls * 6
    const bowlingRating = (
      clamp(wicketsPerInnings / 2 * 10) +
      clamp((12 - economy) / 8 * 10)
    ) / 2
    components.push(bowlingRating)
  }

  if (!components.length) return null
  return Number((components.reduce((total, rating) => total + rating, 0) / components.length).toFixed(1))
}
