import type { ClinchStatus } from '@/selectors'

/** The clinch letters beside a team's name, and what each means (the table and its legend). */
export const CLINCH: Record<ClinchStatus, { mark: string; label: string }> = {
  bye: { mark: 'z', label: 'Clinched a first-round bye' },
  division: { mark: 'y', label: 'Clinched the division' },
  playoffs: { mark: 'x', label: 'Clinched a playoff spot' },
  eliminated: { mark: 'e', label: 'Eliminated' },
}
