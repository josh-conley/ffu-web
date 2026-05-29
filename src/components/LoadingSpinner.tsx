export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-12 text-slate-500 dark:text-slate-400">
      <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
