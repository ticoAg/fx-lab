import { Link } from 'react-router-dom'
import { useLang } from '../../i18n.ts'
import { LangToggle } from '../../LangProvider.tsx'
import { StageToggle } from './StageToggle.tsx'
import type { KitStage } from './stageBg.ts'

export function SvgKitsHeader({
  crumb,
  bg,
  onBgChange,
}: {
  crumb?: string
  bg?: KitStage
  onBgChange?: (bg: KitStage) => void
}) {
  const { lang } = useLang()
  const zh = lang === 'zh'

  return (
    <header className="site-header">
      <div className="site-header-left">
        <Link className="brand" to="/" title={zh ? '前往动效画廊首页' : 'Home'}>
          <span className="brand-logo" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" />
              <circle cx="17" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" opacity="0.6" />
            </svg>
          </span>
          <span className="brand-name">{zh ? '运动实验室' : 'fx-lab'}</span>
          <span className="brand-badge">fx-lab</span>
        </Link>

        <span className="header-divider" aria-hidden="true" />

        <nav className="kit-crumbs" aria-label="breadcrumb">
          <Link className="crumb-link" to="/svg-kits">
            {zh ? 'SVG 图标套件' : 'SVG Kits'}
          </Link>
          {crumb && (
            <>
              <svg className="crumb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="crumb-current" title={crumb}>{crumb}</span>
            </>
          )}
        </nav>
      </div>

      <div className="spacer" />

      <div className="site-header-right">
        {bg && onBgChange && (
          <div className="header-stage-box">
            <StageToggle bg={bg} onChange={onBgChange} />
          </div>
        )}

        <div className="header-nav-group">
          <Link className="nav-btn nav-btn-subtle" to="/svg-kits/admin" title={zh ? '上传 / 管理新主题' : 'Upload themes'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{zh ? '上传' : 'Upload'}</span>
          </Link>

          <Link className="nav-btn nav-btn-primary" to="/" title={zh ? '探索 3D / WebGL 动效画廊' : 'Explore Motion Gallery'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{zh ? '动效画廊' : 'Gallery'}</span>
          </Link>
        </div>

        <LangToggle />
      </div>
    </header>
  )
}
