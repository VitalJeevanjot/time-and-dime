import Decimal from 'decimal.js'

const EXTRA_DIVISION_DIGITS = 100
const MAX_DECIMAL_DIGITS = 10_000
const MAX_ABSOLUTE_EXPONENT = 10_000n
const DECIMAL_PATTERN = /^[+-]?(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/

/** Converts a supported value into a finite, canonical decimal string. */
export function normalizeDecimalValue(value, fieldName = 'value') {
  if (!['string', 'number', 'bigint'].includes(typeof value)) {
    throw new Error(`${fieldName} must be a decimal value.`)
  }

  const normalizedInput = String(value).trim()
  if (!normalizedInput) throw new Error(`${fieldName} is required.`)

  const decimalParts = normalizedInput.match(DECIMAL_PATTERN)
  if (!decimalParts) throw new Error(`${fieldName} must be a valid decimal value.`)

  const digitCount = `${decimalParts[1] ?? ''}${decimalParts[2] ?? ''}${decimalParts[3] ?? ''}`.length
  if (digitCount > MAX_DECIMAL_DIGITS) {
    throw new Error(`${fieldName} cannot contain more than ${MAX_DECIMAL_DIGITS} digits.`)
  }

  const exponent = BigInt(decimalParts[4] ?? '0')
  if (exponent > MAX_ABSOLUTE_EXPONENT || exponent < -MAX_ABSOLUTE_EXPONENT) {
    throw new Error(
      `${fieldName} exponent must be between -${MAX_ABSOLUTE_EXPONENT} and ${MAX_ABSOLUTE_EXPONENT}.`,
    )
  }

  let decimalValue
  try {
    decimalValue = new Decimal(normalizedInput)
  } catch {
    throw new Error(`${fieldName} must be a valid decimal value.`)
  }

  if (!decimalValue.isFinite()) throw new Error(`${fieldName} must be finite.`)
  if (Math.abs(decimalValue.e) > Number(MAX_ABSOLUTE_EXPONENT)) {
    throw new Error(
      `${fieldName} exponent must be between -${MAX_ABSOLUTE_EXPONENT} and ${MAX_ABSOLUTE_EXPONENT}.`,
    )
  }
  return decimalValue.toString()
}

/**
 * Creates an isolated Decimal constructor sized for the current operands.
 * Terminating operations retain every input digit. Repeating division keeps an
 * additional 100 significant digits and rounds the last digit using half-even.
 */
function createArithmeticDecimal(...values) {
  const normalizedValues = values.map((value, index) =>
    normalizeDecimalValue(value, `operand ${index + 1}`),
  )
  const decimalValues = normalizedValues.map((value) => new Decimal(value))
  const inputDigitCount = decimalValues.reduce(
    (total, value) => total + value.precision(),
    0,
  )
  const highestExponent = Math.max(...decimalValues.map((value) => value.e))
  const lowestDigitPlace = Math.min(
    ...decimalValues.map((value) => value.e - value.precision() + 1),
  )
  const exponentSpan = highestExponent - lowestDigitPlace + 1
  const precision =
    Math.max(EXTRA_DIVISION_DIGITS, inputDigitCount, exponentSpan) + EXTRA_DIVISION_DIGITS
  const ArithmeticDecimal = Decimal.clone({
    precision,
    rounding: Decimal.ROUND_HALF_EVEN,
    modulo: Decimal.ROUND_DOWN,
  })

  return {
    Decimal: ArithmeticDecimal,
    values: normalizedValues,
  }
}

/** Returns whether a decimal value is exactly zero. */
export function isZeroDecimal(value) {
  return new Decimal(normalizeDecimalValue(value)).isZero()
}

/** Calculates an exact percentage operand, subject only to the division policy above. */
export function calculatePercentageAmount(baseValue, percentageValue) {
  const arithmetic = createArithmeticDecimal(baseValue, percentageValue, '100')
  const [base, percentage, hundred] = arithmetic.values.map(
    (value) => new arithmetic.Decimal(value),
  )

  return base.times(percentage).dividedBy(hundred).toString()
}

/** Applies one card operation to a target Value and returns a canonical decimal string. */
export function applyDecimalOperation(targetValue, operandValue, operation) {
  const arithmetic = createArithmeticDecimal(targetValue, operandValue)
  const target = new arithmetic.Decimal(arithmetic.values[0])
  const operand = new arithmetic.Decimal(arithmetic.values[1])

  if ((operation === '/' || operation === '%') && operand.isZero()) {
    const operationName = operation === '/' ? 'divide' : 'calculate a modulus'
    throw new Error(`Cannot ${operationName} using zero.`)
  }

  switch (operation) {
    case '+':
      return target.plus(operand).toString()
    case '-':
      return target.minus(operand).toString()
    case '*':
      return target.times(operand).toString()
    case '/':
      return target.dividedBy(operand).toString()
    case '%':
      return target.modulo(operand).toString()
    default:
      throw new Error(`Unsupported operation: ${operation}.`)
  }
}
