import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '@designcodeio/threeui/style.css'
import './index.css'
import './svg-kits.css'
import { App } from './App.tsx'
import { LangProvider } from './LangProvider.tsx'
import { SvgKitsIndexPage } from './pages/svg-kits/SvgKitsIndexPage.tsx'
import { SvgKitThemePage } from './pages/svg-kits/SvgKitThemePage.tsx'
import { SvgKitsAdminPage } from './pages/svg-kits/SvgKitsAdminPage.tsx'

// After a deploy, an open tab still points at the old hashed chunks, which no longer exist.
// Reload once to pick up the new index.html. The stored time stops a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('fx-lab:chunk-reload') ?? 0)
    if (Date.now() - last < 10_000) return
    sessionStorage.setItem('fx-lab:chunk-reload', String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/svg-kits" element={<SvgKitsIndexPage />} />
          <Route path="/svg-kits/admin" element={<SvgKitsAdminPage />} />
          <Route path="/svg-kits/:themeId" element={<SvgKitThemePage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  </StrictMode>,
)
