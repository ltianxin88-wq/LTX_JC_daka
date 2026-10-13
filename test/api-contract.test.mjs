import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('local API permits only GET read endpoints with a same-origin client marker', async () => {
  const source = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8')
  assert.match(source, /CLIENT_HEADER/)
  assert.match(source, /此版本仅提供只读考勤状态接口/)
  assert.match(source, /'snapshot'/)
  assert.doesNotMatch(source, /child_process|exec\(/)
})
