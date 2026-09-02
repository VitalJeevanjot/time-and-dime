import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDecimalOperation,
  calculatePercentageAmount,
  normalizeDecimalValue,
} from '../src/utils/decimalCalculation.js'

test('decimal arithmetic preserves values that JavaScript Number cannot', () => {
  assert.equal(applyDecimalOperation('0.1', '0.2', '+'), '0.3')
  assert.equal(
    applyDecimalOperation('90071992547409931234567890', '10', '+'),
    '9.00719925474099312345679e+25',
  )
  assert.equal(applyDecimalOperation('-1.25', '0.5', '*'), '-0.625')
})

test('percentage operands use precise decimal strings', () => {
  assert.equal(calculatePercentageAmount('0.8', '12.5'), '0.1')
  assert.equal(calculatePercentageAmount('500', '-6.25'), '-31.25')
})

test('decimal validation rejects alternate syntax, dangerous exponents, and zero divisors', () => {
  assert.throws(() => normalizeDecimalValue('0xff'), /valid decimal/)
  assert.throws(() => normalizeDecimalValue('1_000'), /valid decimal/)
  assert.throws(() => normalizeDecimalValue('1e10001'), /exponent/)
  assert.throws(() => applyDecimalOperation('10', '0', '/'), /zero/)
  assert.throws(() => applyDecimalOperation('10', '0', '%'), /zero/)
})
