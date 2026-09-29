import { UPR_MIN_WEEKS } from '@/selectors'

/**
 * Says why a season's UPR column isn't there yet. One component rather than a line of copy in each
 * table, so the rule and its explanation stay together with the constant that enforces it.
 */
export function UprNote() {
  return (
    <p className="text-sm text-muted">
      UPR appears once {UPR_MIN_WEEKS} weeks are played — it rates a team on its average, high and
      low, which say little about anyone until a few weeks are in the books.
    </p>
  )
}
