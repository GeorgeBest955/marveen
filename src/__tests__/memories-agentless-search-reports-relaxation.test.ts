/**
 * MEMAGENTLESSRELAX1018: the agent-less GET /api/memories branch labels a
 * relaxed answer as relaxed.
 *
 * searchMemories() retries with OR when the AND query finds nothing, but it
 * never told the route, so the X-Memory-Search header said relaxed=false on
 * every agent-less answer. Measured on a copy of the live database: a pattern
 * that never existed answered 50 rows with "strict=false; relaxed=false;
 * hits=50", while the same query with ?agent= said relaxed=true. The header is
 * the only thing that tells a rescued near-miss from a real match, so on this
 * branch the rule "read the header" protected nothing.
 *
 * Negative controls: an existing term stays relaxed=false, strict=1 still
 * answers zero, and a single unknown token (nothing to drop, so no retry)
 * stays relaxed=false with zero hits.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { initDatabase, saveAgentMemory } from '../db.js'
import { tryHandleMemories } from '../web/routes/memories.js'
import type { RouteContext } from '../web/routes/types.js'

vi.mock('../config.js', async () => {
  const actual = await vi.importActual<typeof import('../config.js')>('../config.js')
  return { ...actual, MAIN_AGENT_ID: 'agent-a', ALLOWED_CHAT_ID: 'test-chat', OLLAMA_URL: '' }
})

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

async function search(params: Record<string, string>): Promise<{ hits: number; header: string }> {
  const url = new URL('http://localhost:3420/api/memories')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const headers: Record<string, string> = {}
  let body = ''
  const res = {
    writeHead: vi.fn(),
    setHeader: (k: string, v: string) => { headers[k.toLowerCase()] = String(v) },
    end: (b?: string | Buffer) => { body = b ? b.toString() : '' },
  }
  const ctx = { req: { headers: {} } as any, res: res as any, path: '/api/memories', method: 'GET', url } as RouteContext
  expect(await tryHandleMemories(ctx)).toBe(true)
  return { hits: (JSON.parse(body) as unknown[]).length, header: headers['x-memory-search'] ?? '' }
}

// "minta" exists, "xyzzyqq" never does: the AND query finds nothing, the OR
// retry rescues the "minta" row.
const EXISTING = 'minta'
const NEVER_PLUS_EXISTING = 'xyzzyqq minta'
const NEVER_SINGLE = 'zzzqqqvv'

beforeAll(() => {
  initDatabase(':memory:')
  saveAgentMemory('agent-a', 'A kiadasi minta leirasa a release-lanchoz.', 'warm', 'kiadas')
})

describe('agent-less memory search reports relaxation in X-Memory-Search', () => {
  it('a query that only the OR retry answers says relaxed=true', async () => {
    const r = await search({ q: NEVER_PLUS_EXISTING })
    expect(r.hits).toBeGreaterThan(0)
    expect(r.header).toBe(`strict=false; relaxed=true; hits=${r.hits}`)
  })

  it('an existing term stays relaxed=false (negative control)', async () => {
    const r = await search({ q: EXISTING })
    expect(r.hits).toBeGreaterThan(0)
    expect(r.header).toBe(`strict=false; relaxed=false; hits=${r.hits}`)
  })

  it('strict=1 still answers zero, and says it was not relaxed', async () => {
    const r = await search({ q: NEVER_PLUS_EXISTING, strict: '1' })
    expect(r).toEqual({ hits: 0, header: 'strict=true; relaxed=false; hits=0' })
  })

  it('a single unknown token has nothing to drop: zero hits, relaxed=false', async () => {
    const r = await search({ q: NEVER_SINGLE })
    expect(r).toEqual({ hits: 0, header: 'strict=false; relaxed=false; hits=0' })
  })

  it('agrees with the agent-scoped branch on the same query', async () => {
    for (const q of [NEVER_PLUS_EXISTING, EXISTING]) {
      const global = await search({ q })
      const scoped = await search({ q, agent: 'agent-a' })
      expect(global.header, q).toBe(scoped.header)
    }
  })
})
