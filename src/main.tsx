import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Some pages load as separate chunks. A deploy replaces every hashed chunk, so a tab opened before it
// can ask for a chunk that no longer exists; reload once to pick up the new build instead of
// breaking. The sessionStorage stamp stops a loop if a chunk is genuinely missing.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'ffu:chunk-reload'
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) < 10_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
