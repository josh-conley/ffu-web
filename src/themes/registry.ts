// The site's themes. Two kinds:
//  - the standard look in its light and dark modes (tokens live in src/index.css), and
//  - "skins": a full restyle scoped under `html[data-theme='<id>']`, each in its own stylesheet that
//    is fetched only when the skin is chosen, so the standard site pays nothing for them.
//
// A skin sits on top of one of the two modes (`dark`), because components use Tailwind's `dark:`
// variant for a handful of semantic colors (the position badges) and those must keep working.
//
// The holiday skins also come on by themselves for their week (seasonal.ts).
//
// Adding a skin: one entry here, one `<id>.css` beside this file, optionally a voice in
// voices/. If it is dark, add its id to the pre-paint script in index.html too (a test checks
// the two lists agree). No component should need to change.

export type ThemeId =
  | 'light'
  | 'dark'
  | 'xp'
  | 'arcade'
  | 'matrix'
  | 'comic'
  | 'newspaper'
  | 'halloween'
  | 'thanksgiving'
  | 'christmas'

export interface ThemeDef {
  id: ThemeId
  label: string
  /** Whether the theme sits on the dark mode (sets `.dark` on <html>). */
  dark: boolean
  /** Fetches the skin's stylesheet (and any fonts). Absent for the standard look. */
  load?: () => Promise<unknown>
}

/** A skin's stylesheet together with the display font it uses. */
const withFont = (font: Promise<unknown>, sheet: Promise<unknown>) => Promise.all([font, sheet])

export const THEMES: readonly ThemeDef[] = [
  { id: 'light', label: 'Light', dark: false },
  { id: 'dark', label: 'Dark', dark: true },
  { id: 'xp', label: 'Windows XP', dark: false, load: () => import('./xp.css') },
  {
    id: 'arcade',
    label: 'Arcade',
    dark: true,
    load: () => withFont(import('@fontsource/orbitron/latin-700.css'), import('./arcade.css')),
  },
  { id: 'matrix', label: 'Matrix', dark: true, load: () => import('./matrix.css') },
  { id: 'comic', label: 'Comic Book', dark: false, load: () => withFont(import('@fontsource/bangers/latin-400.css'), import('./comic.css')) },
  { id: 'newspaper', label: 'Newspaper', dark: false, load: () => withFont(import('@fontsource/playfair-display/latin-900.css'), import('./newspaper.css')) },
  { id: 'halloween', label: 'Halloween', dark: true, load: () => withFont(import('@fontsource/creepster/latin-400.css'), import('./halloween.css')) },
  { id: 'thanksgiving', label: 'Thanksgiving', dark: false, load: () => import('./thanksgiving.css') },
  { id: 'christmas', label: 'Christmas', dark: true, load: () => import('./christmas.css') },
]

export const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value)

export function themeDef(id: ThemeId): ThemeDef {
  const def = THEMES.find((t) => t.id === id)
  if (!def) throw new Error(`Unknown theme: ${id}`)
  return def
}
