export function ErrorMessage({ error }: { error: Error | string }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  )
}
