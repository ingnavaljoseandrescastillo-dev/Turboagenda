import test from 'node:test'
import assert from 'node:assert/strict'
import { getAuthRedirectPath } from '../src/lib/auth-redirect.ts'

test('preserves account recovery and dashboard destinations', () => {
  assert.equal(getAuthRedirectPath('/reset-password'), '/reset-password')
  assert.equal(getAuthRedirectPath('/dashboard/settings?tab=payments'), '/dashboard/settings?tab=payments')
  assert.equal(getAuthRedirectPath('/dashboard/onboarding'), '/dashboard/onboarding')
})

test('rejects external, malformed, and unrelated callback destinations', () => {
  for (const path of [null, '', '//example.org', 'https://example.org/dashboard', '/\\example.org', '/dashboard/../../admin', '/api/cron/appointment-reminders', '/dashboard\n', '/dashboardevil', '/reset-password?next=https://example.org']) {
    assert.equal(getAuthRedirectPath(path), '/dashboard', String(path))
  }
})
