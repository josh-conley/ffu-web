// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// and auto-cleans the DOM between tests. Wired via vite.config.ts `test.setupFiles`.
import '@testing-library/jest-dom/vitest'
