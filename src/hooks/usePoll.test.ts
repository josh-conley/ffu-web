import { act, renderHook } from '@testing-library/react'
import { usePoll } from './usePoll'

// Fake timers for the interval only; promises still resolve on the microtask queue.
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
afterEach(() => vi.useRealTimers())

const flush = () => act(() => vi.advanceTimersByTimeAsync(0))

describe('usePoll', () => {
  it('re-fetches every interval', async () => {
    let n = 0
    const fetcher = vi.fn(async () => ++n)
    const { result } = renderHook(() => usePoll('k', fetcher, true, 60_000))
    await flush()
    expect(result.current.data).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(result.current.data).toBe(2)
  })

  it('drops an answer that arrives after a newer one', async () => {
    const resolvers: ((v: string) => void)[] = []
    const fetcher = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)))
    const { result } = renderHook(() => usePoll('k', fetcher, true, 60_000))
    // The tab coming back fires a second read while the first is still out.
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(async () => {
      resolvers[1]?.('newer')
      resolvers[0]?.('older')
    })
    expect(result.current.data).toBe('newer')
  })

  it('stops once the value is final', async () => {
    const fetcher = vi.fn(async () => 'done')
    renderHook(() => usePoll('k', fetcher, true, 60_000, (v) => v === 'done'))
    await flush()
    await act(() => vi.advanceTimersByTimeAsync(180_000))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
