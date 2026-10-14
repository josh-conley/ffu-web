import { allowedOrigin, corsHeaders, fail } from './http'
import { route } from './routes'
import { d1Store, type D1Database } from './store'
import { siteTournamentLoader } from './tournament'

// Worker entry: wires the real dependencies into the routes and wraps every answer in CORS.

interface Env {
  DB: D1Database
  DATA_ORIGIN: string
  ALLOWED_ORIGINS: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(allowedOrigin(request.headers.get('Origin'), env.ALLOWED_ORIGINS))
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    let response: Response
    try {
      response = await route(request, {
        store: d1Store(env.DB),
        loadTournament: siteTournamentLoader(env.DATA_ORIGIN),
        now: Date.now,
      })
    } catch (err) {
      // Details go to the Worker log, never to the caller.
      console.error(err)
      response = fail(500, 'Something went wrong. Try again.')
    }
    for (const [name, value] of Object.entries(cors)) response.headers.set(name, value)
    return response
  },
}
