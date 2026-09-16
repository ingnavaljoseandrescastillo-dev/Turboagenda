import test from 'node:test'
import assert from 'node:assert/strict'
import { isTrustedMutation } from '../src/lib/request-origin.ts'

const url = 'https://turboagenda.pt/api/appointments'
test('permits same-origin mutations and non-browser server calls', () => {
  assert.equal(isTrustedMutation('POST', url, new Headers({ origin: 'https://turboagenda.pt', cookie: 'session=test' })), true)
  assert.equal(isTrustedMutation('POST', url, new Headers({ authorization: 'Bearer test' })), true)
  assert.equal(isTrustedMutation('GET', url, new Headers()), true)
})
test('rejects foreign origins and cookie mutations without an origin', () => {
  for (const headers of [
    { origin: 'https://evil.test' },
    { origin: 'null' },
    { 'sec-fetch-site': 'cross-site' },
    { cookie: 'session=test' },
    { origin: 'https://turboagenda.pt.evil.test' },
  ]) assert.equal(isTrustedMutation('POST', url, new Headers(headers)), false)
})
