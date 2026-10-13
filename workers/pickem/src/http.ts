// Response helpers and CORS. CORS here is a browser courtesy, not access control: it decides which
// sites' pages may call the API, while who may change an entry is decided by its PIN.

const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.ffu-web-preview\.pages\.dev$/

export function allowedOrigin(origin: string | null, allowList: string): string | undefined {
  if (origin === null) return undefined
  const listed = allowList.split(',').map((o) => o.trim())
  return listed.includes(origin) || PREVIEW_ORIGIN.test(origin) ? origin : undefined
}

export function corsHeaders(origin: string | undefined): Record<string, string> {
  if (origin === undefined) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export const fail = (status: number, error: string) => json({ error }, status)

/** Picks for a full bracket are ~1KB; anything far past that is not a real entry. */
const MAX_BODY_BYTES = 16 * 1024

/** The request's JSON object body, or a ready error response. */
export async function readBody(request: Request): Promise<Record<string, unknown> | Response> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return fail(413, 'Request too large')
  try {
    const body: unknown = JSON.parse(text)
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) return body as Record<string, unknown>
  } catch {
    // fall through
  }
  return fail(400, 'Body must be a JSON object')
}
