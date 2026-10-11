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
