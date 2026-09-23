import assert from 'node:assert/strict'
import test from 'node:test'
import { smsReminderAllowance } from '../src/lib/sms-reminder-access.ts'

const now = new Date('2026-09-22T12:00:00Z')

test('active trials receive a monthly SMS allowance', () => {
  const access = smsReminderAllowance({ plan: 'trial', status: 'trial', trial_ends_at: '2026-10-01T00:00:00Z' }, null, now)
  assert.deepEqual(access, { available: true, limit: 50, period: 'month' })
})

test('expired trials cannot keep sending SMS', () => {
  const access = smsReminderAllowance({ plan: 'trial', status: 'trial', trial_ends_at: '2026-09-21T00:00:00Z' }, null, now)
  assert.equal(access.available, false)
})

test('paid plans retain monthly SMS allowance', () => {
  const access = smsReminderAllowance({ plan: 'basic', status: 'active' }, null, now)
  assert.deepEqual(access, { available: true, limit: 150, period: 'month' })
})

test('an administrator override retains temporary monthly access', () => {
  const access = smsReminderAllowance({ plan: 'trial', status: 'trial', trial_ends_at: '2026-09-01T00:00:00Z' }, '2026-10-01T00:00:00Z', now)
  assert.deepEqual(access, { available: true, limit: 150, period: 'month' })
})
