import { renderHook, waitFor } from '@testing-library/react'
import { useSeason } from './useLeagueData'
import premier2024 from '../../public/data/2024/premier.json'

// Smoke test: the hook resolves provider data and reports loading → loaded. The provider
// itself is covered in staticProvider.test.ts; here we just stub fetch with a fixture.
afterEach(() => vi.unstubAllGlobals())

it('useSeason transitions loading → data', async () => {
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, status: 200, json: async () => premier2024 } as Response),
  )

  const { result } = renderHook(() => useSeason('PREMIER', '2024'))
  expect(result.current.loading).toBe(true)
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.data?.teams).toHaveLength(12)
  expect(result.current.error).toBeUndefined()
})
