/**
 * Set only in preview builds: preview-deploy.yml passes the branch being previewed and the URL of
 * its pull request (or a search for it, before the PR exists). Both are absent in production, where
 * nothing preview-related renders.
 */
export interface PreviewBuild {
  branch: string
  prUrl: string
}

const branch = import.meta.env.VITE_PREVIEW_BRANCH as string | undefined
const prUrl = import.meta.env.VITE_PREVIEW_PR_URL as string | undefined

export const PREVIEW_BUILD: PreviewBuild | undefined = branch && prUrl ? { branch, prUrl } : undefined
