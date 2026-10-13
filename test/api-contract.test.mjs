import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('local API permits reads and a scoped configuration update with a same-origin client marker', async () => {
  const source = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8')
  assert.match(source, /CLIENT_HEADER/)
  assert.match(source, /'snapshot'/)
  assert.match(source, /path === 'configuration' && method === 'PUT'/)
  assert.match(source, /validateConfigurationUpdate/)
  assert.match(source, /16 \* 1024/)
  assert.doesNotMatch(source, /child_process|exec\(/)
})
