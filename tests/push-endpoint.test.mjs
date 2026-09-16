import test from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedPushEndpoint } from '../src/lib/push-endpoint.ts'

test('accepts HTTPS endpoints of supported push providers', () => {
  for (const value of ['https://fcm.googleapis.com/fcm/send/id', 'https://web.push.apple.com/id', 'https://updates.push.services.mozilla.com/wpush/v2/id', 'https://wns.notify.windows.com/id']) assert.equal(isAllowedPushEndpoint(value), true)
})
test('rejects SSRF destinations and hostname tricks', () => {
  for (const value of ['http://fcm.googleapis.com/id', 'https://127.0.0.1', 'https://[::1]', 'https://169.254.169.254', 'https://example.com', 'https://fcm.googleapis.com.evil.test', 'https://fcm.googleapis.com@evil.test', 'https://user@fcm.googleapis.com/id', 'https://fcm.googleapis.com:8443/id', 'https://fcm.googleapis.com/id#fragment', 'not a URL']) assert.equal(isAllowedPushEndpoint(value), false, value)
})
