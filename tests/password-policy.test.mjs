import test from 'node:test'
import assert from 'node:assert/strict'
import { AccountPasswordSchema } from '../src/lib/password-policy.ts'

test('registration requires at least ten password characters', () => {
  assert.equal(AccountPasswordSchema.safeParse('long-enough-password').success, true)
  assert.equal(AccountPasswordSchema.safeParse('short123').success, false)
})

test('password policy rejects excessively long values', () => {
  assert.equal(AccountPasswordSchema.safeParse('a'.repeat(128)).success, true)
  assert.equal(AccountPasswordSchema.safeParse('a'.repeat(129)).success, false)
})
