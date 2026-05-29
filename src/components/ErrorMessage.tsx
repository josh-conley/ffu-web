export function ErrorMessage({ error }: { error: Error | string }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <div role="alert" className="border-l-4 border-accent bg-national-bg p-4 text-national-fg">
      <p className="font-bold uppercase tracking-wide">Something went wrong</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  )
}
