import { useMemo } from 'react'
import { useAllSeasons } from '@/hooks/useLeagueData'
import { ALL_CATEGORY_IDS, computeRecordBook, RECORD_BOOK_SECTIONS, type RecordEntry } from '@/selectors'
import { RecordBookSection } from '@/components/RecordBookSection'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

/** The curated FFU Record Book — one holder per category, derived from all seasons (hidden/WIP route). */
export function RecordBook() {
  const { data: seasons, loading, error } = useAllSeasons()
  const entries = useMemo<Map<string, RecordEntry>>(() => (seasons ? computeRecordBook(seasons) : new Map()), [seasons])

  if (loading) return <LoadingSpinner />
  if (error || !seasons) return <ErrorMessage error={error ?? 'No data'} />

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">FFU Record Book</h1>
        <p className="text-sm text-muted">2018–present · all-time records across every tier.</p>
        <p className="text-xs text-muted">
          Work in progress — {entries.size} of {ALL_CATEGORY_IDS.length} records computed; the rest are coming.
        </p>
      </header>
      {RECORD_BOOK_SECTIONS.map((section) => (
        <RecordBookSection key={section.title} section={section} entries={entries} />
      ))}
    </div>
  )
}
