import { Link } from 'react-router-dom'
import { useLang } from '../../i18n.ts'
import { LangToggle } from '../../LangProvider.tsx'

export function SvgKitsHeader({ crumb }: { crumb?: string }) {
  const { lang } = useLang()
  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <h1>{lang === 'zh' ? '运动实验室' : 'fx-lab'}</h1>
        <small>fx-lab</small>
      </Link>
      <nav className="kit-crumbs" aria-label="breadcrumb">
        <Link to="/svg-kits">{lang === 'zh' ? 'SVG 图标套件' : 'SVG Kits'}</Link>
        {crumb && (
          <>
            <span aria-hidden="true">/</span>
            <span className="current">{crumb}</span>
          </>
        )}
      </nav>
      <div className="spacer" />
      <Link className="nav-link" to="/svg-kits/admin">
        {lang === 'zh' ? '上传' : 'Upload'}
      </Link>
      <Link className="nav-link" to="/">
        {lang === 'zh' ? '动效画廊' : 'Motion gallery'}
      </Link>
      <LangToggle />
    </header>
  )
}
