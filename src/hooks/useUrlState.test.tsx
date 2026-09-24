import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { useUpdateUrlParams, useUrlState } from './useUrlState'

const wrapper = (initial: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  }

// Separate hook instances, as on a real page (the season picker owns `tier`, the page owns `scope`).
function usePage() {
  const [tier, setTier] = useUrlState('tier', 'PREMIER')
  const [scope, setScope] = useUrlState('scope', 'league')
  const update = useUpdateUrlParams()
  const [params] = useSearchParams()
  return { tier, setTier, scope, setScope, update, params }
}

it('composes two writes made from one handler instead of letting the second undo the first', () => {
  const { result } = renderHook(usePage, { wrapper: wrapper('/?scope=union') })
  act(() => {
    result.current.setTier('MASTERS')
    result.current.setScope('league')
  })
  expect(result.current.tier).toBe('MASTERS')
  expect(result.current.scope).toBe('league')
})

it('removes a param written as null and keeps the rest', () => {
  const { result } = renderHook(usePage, { wrapper: wrapper('/?tier=NATIONAL&member=ffu-001') })
  act(() => result.current.update({ member: null }))
  expect(result.current.params.toString()).toBe('tier=NATIONAL')
})
