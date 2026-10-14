import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { MANAGEMENT_HEADER } from './contracts.js'

const AUTHORIZATION_CODE_DIGEST = Buffer.from('582d8de20fc902d6f4a62d96547710d4f37e9b7a58c5f4f00110eb1bcb123eba', 'hex')
const AUTHORIZATION_TTL_MS = 12 * 60 * 60 * 1000

export interface ManagementAuthorizationView {
  token: string
  expiresAt: string
}

export class ManagementAuthorization {
  private readonly tokens = new Map<string, number>()
  private readonly codeDigest: Buffer

  constructor(codeDigest = AUTHORIZATION_CODE_DIGEST) {
    if (codeDigest.length !== AUTHORIZATION_CODE_DIGEST.length) throw new Error('Management authorization digest must be SHA-256.')
    this.codeDigest = Buffer.from(codeDigest)
  }

  authorize(code: string, now = Date.now()): ManagementAuthorizationView {
    const received = createHash('sha256').update(code, 'utf8').digest()
    if (!timingSafeEqual(received, this.codeDigest)) throw authorizationError('管理版授权码不正确。')
    this.removeExpired(now)
    const token = randomBytes(32).toString('base64url')
    const expiresAt = now + AUTHORIZATION_TTL_MS
    this.tokens.set(tokenDigest(token), expiresAt)
    return { token, expiresAt: new Date(expiresAt).toISOString() }
  }

  assert(req: IncomingMessage, now = Date.now()): void {
    this.removeExpired(now)
    const value = req.headers[MANAGEMENT_HEADER]
    const token = Array.isArray(value) ? value[0] : value
    if (typeof token !== 'string' || token.length < 32 || token.length > 256) throw authorizationError('请先输入管理版授权码。')
    const expiresAt = this.tokens.get(tokenDigest(token))
    if (expiresAt === undefined || expiresAt <= now) throw authorizationError('管理版授权已失效，请重新验证。')
  }

  private removeExpired(now: number): void {
    for (const [token, expiresAt] of this.tokens) if (expiresAt <= now) this.tokens.delete(token)
  }
}

function tokenDigest(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function authorizationError(message: string): Error {
  return Object.assign(new Error(message), { status: 401, code: 'MANAGEMENT_AUTHORIZATION_REQUIRED' })
}
