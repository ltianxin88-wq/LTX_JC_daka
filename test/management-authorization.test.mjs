import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { ManagementAuthorization } from '../lib/management-authorization.js'
import { MANAGEMENT_HEADER } from '../lib/contracts.js'

const digest = value => createHash('sha256').update(value, 'utf8').digest()
const request = token => ({ headers: token === undefined ? {} : { [MANAGEMENT_HEADER]: token } })

test('management authorization issues an expiring in-memory token', () => {
  const authorization = new ManagementAuthorization(digest('test-code'))
  const granted = authorization.authorize('test-code', Date.parse('2026-10-14T00:00:00Z'))
  assert.ok(granted.token.length >= 32)
  assert.equal(granted.expiresAt, '2026-10-14T12:00:00.000Z')
  assert.doesNotThrow(() => authorization.assert(request(granted.token), Date.parse('2026-10-14T11:59:59Z')))
  assert.throws(() => authorization.assert(request(granted.token), Date.parse('2026-10-14T12:00:00Z')), /重新验证/u)
})

test('management authorization rejects missing, incorrect, and invented credentials', () => {
  const authorization = new ManagementAuthorization(digest('test-code'))
  assert.throws(() => authorization.authorize('wrong-code'), /不正确/u)
  assert.throws(() => authorization.assert(request()), /先输入/u)
  assert.throws(() => authorization.assert(request('invented-token-that-is-long-enough-to-pass-shape-check')), /已失效/u)
})

test('the configured management code is stored only as a digest', async () => {
  const source = await readFile(new URL('../src/management-authorization.ts', import.meta.url), 'utf8')
  assert.match(source, /582d8de20fc902d6f4a62d96547710d4f37e9b7a58c5f4f00110eb1bcb123eba/u)
  assert.doesNotMatch(source, /Ltx147258369\./u)
})
