export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-12 text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
