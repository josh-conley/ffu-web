// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// and auto-cleans the DOM between tests. Wired via vite.config.ts `test.setupFiles`.
import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { clearSleeperCache } from '@/data/sleeperApi'

// The Sleeper client keeps recent answers in memory (src/data/sleeperApi.ts); each test stubs its
// own `fetch`, so none may inherit another's cached response.
beforeEach(() => clearSleeperCache())
