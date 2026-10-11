import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../i18n.ts'
import { LangToggle } from '../LangProvider.tsx'
import { ThemeToggle } from '../ThemeProvider.tsx'

export type BreadcrumbItem = {
  label: string
  to?: string
}

export type SiteHeaderProps = {
  crumb?: string | BreadcrumbItem[]
  searchSlot?: ReactNode
  stageSlot?: ReactNode
  actionSlot?: ReactNode
}

export function SiteHeader({ crumb, searchSlot, stageSlot, actionSlot }: SiteHeaderProps) {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const location = useLocation()
  const pathname = location.pathname

  const isGalleryActive = pathname === '/'
  const isSvgKitsActive = pathname.startsWith('/svg-kits')

  const breadcrumbs: BreadcrumbItem[] = Array.isArray(crumb)
    ? crumb
    : crumb
    ? [{ label: crumb }]
    : []

  return (
    <header className="site-header">
      <div className="site-header-left">
        {/* Brand */}
        <Link className="brand" to="/" title={zh ? '前往动效实验室首页' : 'Go to Motion Lab home'}>
          <span className="brand-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="7" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="17" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" opacity="0.6" />
              <path d="M11 8c.7 1.2 1.3 2.6 1.3 4s-.6 2.8-1.3 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-name">{zh ? '运动实验室' : 'fx-lab'}</span>
          <span className="brand-badge">SDK v2</span>
        </Link>

        <span className="header-divider" aria-hidden="true" />

        {/* Primary Navigation Hub */}
        <nav className="header-nav" aria-label="Main Navigation">
          <Link
            to="/"
            className={`nav-tab ${isGalleryActive ? 'active' : ''}`}
            aria-current={isGalleryActive ? 'page' : undefined}
          >
            <span className="nav-tab-dot" aria-hidden="true" />
            <span>{zh ? '动效画廊' : 'Gallery'}</span>
          </Link>

          <Link
            to="/svg-kits"
            className={`nav-tab ${isSvgKitsActive ? 'active' : ''}`}
            aria-current={isSvgKitsActive ? 'page' : undefined}
          >
            <span className="nav-tab-dot" aria-hidden="true" />
            <span>{zh ? 'SVG 套件' : 'SVG Kits'}</span>
          </Link>

          <a
            href="http://127.0.0.1:8080/"
            className="nav-tab dict-nav-tab"
            target="_blank"
            rel="noreferrer"
            title={zh ? '前往词典项目 (新标签页)' : 'Open Dictionary (External)'}
          >
            <span>{zh ? '返回词典' : 'Dictionary'}</span>
            <svg
              className="external-icon"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </nav>

        {/* Contextual Breadcrumb (if any) */}
        {breadcrumbs.length > 0 && (
          <nav className="header-breadcrumbs" aria-label="Breadcrumb">
            <span className="crumb-separator" aria-hidden="true">/</span>
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return isLast || !b.to ? (
                <span key={idx} className="crumb-leaf" title={b.label}>
                  {b.label}
                </span>
              ) : (
                <Link key={idx} to={b.to} className="crumb-link">
                  {b.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      {/* Center Search Slot (Optional) */}
      {searchSlot && <div className="site-header-center">{searchSlot}</div>}

      {/* Right Controls */}
      <div className="site-header-right">
        {/* Stage Controller (Only in Kit contexts) */}
        {stageSlot && <div className="header-stage-container">{stageSlot}</div>}

        {/* Action button (e.g. Upload) */}
        {actionSlot && <div className="header-action-container">{actionSlot}</div>}

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {/* Language Toggle (ZH / EN) */}
        <LangToggle />
      </div>
    </header>
  )
}
