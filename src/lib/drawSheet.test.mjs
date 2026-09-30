import { SEED_PATTERN, drawCommand, formatDrawSheet } from './drawSheet.mjs'
import { drawCheckCode, drawCup } from './cupDraw.mjs'

// The command on screen is what members re-run to check the draw, so it has to reproduce the
// seed exactly: same case, and one argument even when the seed has spaces.

describe('drawCommand', () => {
  it('leaves a plain seed bare', () => {
    expect(drawCommand('4471')).toBe('npm run draw-cup -- --seed 4471')
  })

  it('quotes a seed with spaces, keeping its case', () => {
    expect(drawCommand('week4 SNF 51')).toBe('npm run draw-cup -- --seed "week4 SNF 51"')
  })
})

describe('SEED_PATTERN', () => {
  it('accepts the seeds a draw would use', () => {
    for (const s of ['51', 'week4 SNF 51', 'wk4-tnf:47', '#51']) expect(SEED_PATTERN.test(s)).toBe(true)
  })

  it('refuses anything a shell would reinterpret inside double quotes', () => {
    for (const s of ['$HOME', 'a"b', 'a\\b', '`x`', 'a!b']) expect(SEED_PATTERN.test(s)).toBe(false)
  })
})

describe('formatDrawSheet', () => {
  it('prints the check code under the seed', () => {
    const mk = (p) => Array.from({ length: 12 }, (_, i) => ({ ffuId: `${p}-${i + 1}`, name: `${p} ${i + 1}` }))
    const field = { PREMIER: mk('p'), MASTERS: mk('m'), NATIONAL: mk('n') }
    const result = drawCup(field, '47')
    expect(formatDrawSheet(field, result, '47').split('\n').slice(1, 3)).toEqual(['Seed: 47', `Check: ${drawCheckCode(result)}`])
  })
})
