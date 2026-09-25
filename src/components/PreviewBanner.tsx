import type { PreviewBuild } from '@/config'

/**
 * A strip across the top of a preview build (never production): says which branch this is and links
 * to its pull request, so whoever is checking the preview can go straight to GitHub's Merge button.
 * Only a link: merging needs a signed-in GitHub account, and no credentials belong in the client.
 */
export function PreviewBanner({ preview }: { preview: PreviewBuild | undefined }) {
  if (!preview) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-notable px-4 py-1.5 text-center text-xs font-semibold text-bg">
      <span>
        Preview of <code className="font-mono">{preview.branch}</code>, not the live site
      </span>
      <a href={preview.prUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:no-underline">
        Looks good? Merge it on GitHub →
      </a>
    </div>
  )
}
