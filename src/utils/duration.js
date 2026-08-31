const durationParts = [
  ['years', 'Years'],
  ['months', 'Months'],
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
  ['milliseconds', 'Milliseconds'],
]

function toNonNegativeInteger(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(number)))
}

function safeTotal(value) {
  return Number.isSafeInteger(value) ? value : Number.MAX_SAFE_INTEGER
}

export function normalizeDurationParts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  const parts = Object.fromEntries(
    durationParts.map(([partName]) => [partName, toNonNegativeInteger(input[partName])]),
  )
  const smallestPart = durationParts.findLast(([partName]) => parts[partName] > 0)
  if (!smallestPart) return null

  const [smallestPartName, unit] = smallestPart
  const totalDays = safeTotal(parts.years * 365 + parts.months * 30 + parts.days)
  let value

  switch (smallestPartName) {
    case 'years':
      value = parts.years
      break
    case 'months':
      value = safeTotal(parts.years * 12 + parts.months)
      break
    case 'days':
      value = totalDays
      break
    case 'hours':
      value = safeTotal(totalDays * 24 + parts.hours)
      break
    case 'minutes':
      value = safeTotal((totalDays * 24 + parts.hours) * 60 + parts.minutes)
      break
    case 'seconds':
      value = safeTotal(
        ((totalDays * 24 + parts.hours) * 60 + parts.minutes) * 60 + parts.seconds,
      )
      break
    default:
      value = safeTotal(
        (((totalDays * 24 + parts.hours) * 60 + parts.minutes) * 60 + parts.seconds) * 1000 +
          parts.milliseconds,
      )
  }

  return { value, unit }
}
