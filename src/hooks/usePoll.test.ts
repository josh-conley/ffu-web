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
    expect(fetcher).toHaveBeenLastCalledWith(false)
  })

  it('refresh() fetches at once, marked manual, and restarts the interval from there', async () => {
    let n = 0
    const fetcher = vi.fn(async () => ++n)
    const { result } = renderHook(() => usePoll('k', fetcher, true, 60_000))
    await flush()
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    act(() => result.current.refresh())
    expect(result.current.refreshing).toBe(true)
    await flush()
    expect(fetcher).toHaveBeenLastCalledWith(true)
    expect(result.current).toMatchObject({ data: 2, refreshing: false })
    // The tick that was due at 60s was replaced by one a full interval after the refresh.
    await act(() => vi.advanceTimersByTimeAsync(59_000))
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('drops an answer that arrives after a newer one', async () => {
    const resolvers: ((v: string) => void)[] = []
    const fetcher = vi.fn(() => new Promise<string>((resolve) => resolvers.push(resolve)))
    const { result } = renderHook(() => usePoll('k', fetcher, true, 60_000))
    act(() => result.current.refresh())
    await act(async () => {
      resolvers[1]?.('newer')
      resolvers[0]?.('older')
    })
    expect(result.current.data).toBe('newer')
  })

  it('stops once the value is final, and a refresh then does nothing', async () => {
    const fetcher = vi.fn(async () => 'done')
    const { result } = renderHook(() => usePoll('k', fetcher, true, 60_000, (v) => v === 'done'))
    await flush()
    act(() => result.current.refresh())
    expect(result.current.refreshing).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(180_000))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
