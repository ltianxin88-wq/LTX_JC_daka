import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from '../lib/config.js'

function config(pythonPath = 'python') {
  return {
    dataRoot: '',
    legacyImportRoot: '',
    pythonPath,
    pythonPackageIndex: 'https://mirrors.aliyun.com/pypi/simple',
    bridgeTimeoutMs: 8000,
  }
}

test('default Python uses the runtime supplied by Desktop', () => {
  const previous = process.env.DSH_DESKTOP_PYTHON
  process.env.DSH_DESKTOP_PYTHON = 'C:\\Program Files\\JC DSH Desktop\\resources\\office-runtime\\python.exe'
  try {
    assert.equal(resolveConfig(config()).pythonPath, process.env.DSH_DESKTOP_PYTHON)
  } finally {
    if (previous === undefined) delete process.env.DSH_DESKTOP_PYTHON
    else process.env.DSH_DESKTOP_PYTHON = previous
  }
})

test('an explicitly configured Python executable overrides Desktop', () => {
  const previous = process.env.DSH_DESKTOP_PYTHON
  process.env.DSH_DESKTOP_PYTHON = 'C:\\bundled\\python.exe'
  try {
    assert.equal(resolveConfig(config('D:\\custom\\python.exe')).pythonPath, 'D:\\custom\\python.exe')
  } finally {
    if (previous === undefined) delete process.env.DSH_DESKTOP_PYTHON
    else process.env.DSH_DESKTOP_PYTHON = previous
  }
})

test('standalone Harness retains the system Python fallback', () => {
  const previous = process.env.DSH_DESKTOP_PYTHON
  delete process.env.DSH_DESKTOP_PYTHON
  try {
    assert.equal(resolveConfig(config()).pythonPath, 'python')
  } finally {
    if (previous !== undefined) process.env.DSH_DESKTOP_PYTHON = previous
  }
})
