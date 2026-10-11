import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { KitSvg } from '../../components/svg-kits/KitSvg.tsx'
import { SvgKitsHeader } from '../../components/svg-kits/SvgKitsHeader.tsx'
import { iconUrl } from '../../content/svg-kits/index.ts'
import { useSvgKits } from '../../content/svg-kits/useSvgKits.ts'
import { t, useLang } from '../../i18n.ts'

export function SvgKitsIndexPage() {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const { data, error, loading } = useSvgKits()
  const kits = data?.themes ?? []
  const total = kits.reduce((n, k) => n + k.icons.length, 0)

  useEffect(() => {
    document.title = zh ? 'SVG 图标套件 · fx-lab' : 'SVG Kits · fx-lab'
  }, [zh])

  return (
    <div className="app kit-page">
      <SvgKitsHeader />
      <main className="kit-main">
        <section className="kit-hero">
          <h2>{zh ? 'SVG 图标套件' : 'SVG Kits'}</h2>
          <p>
            {zh
              ? '按主题整理的动画 SVG 图标。单文件自包含、内置 CSS 动画，可复制源码或下载。新主题从网站上传，不写进 git。'
              : 'Animated SVG icons organized by theme. Each file is self-contained with built-in CSS animation. New themes are uploaded on the site, not committed to git.'}
          </p>
          {!loading && (
            <p className="kit-store-line">
              {kits.length} {zh ? '个主题' : 'themes'} · {total} {zh ? '个图标' : 'icons'}
              {data ? ` · ${data.store.backend}` : ''}
              <Link className="kit-inline-link" to="/svg-kits/admin">
                {zh ? '上传 / 管理' : 'Upload / admin'}
              </Link>
            </p>
          )}
        </section>
        {loading && <p className="kit-empty">{zh ? '加载中…' : 'Loading…'}</p>}
        {error && <p className="kit-empty">{error}</p>}
        {!loading && !error && kits.length === 0 && (
          <p className="kit-empty">
            {zh ? '还没有主题。' : 'No themes yet.'}{' '}
            <Link to="/svg-kits/admin">{zh ? '去上传' : 'Go upload'}</Link>
          </p>
        )}
        <div className="kit-theme-grid">
          {kits.map((kit) => (
            <Link key={kit.id} to={`/svg-kits/${kit.id}`} className="kit-theme-card">
              <div className="kit-theme-cover">
                <KitSvg className="kit-theme-cover-main" src={iconUrl(kit.id, kit.cover)} alt="" />
                <div className="kit-theme-strip">
                  {kit.icons
                    .filter((i) => i.id !== kit.cover)
                    .slice(0, 6)
                    .map((i) => (
                      <KitSvg key={i.id} src={iconUrl(kit.id, i.id)} alt="" />
                    ))}
                </div>
              </div>
              <div className="kit-theme-meta">
                <h3>
                  {t(kit.title, lang)}
                  <span className="kit-count">
                    {kit.icons.length} {zh ? '个图标' : 'icons'}
                  </span>
                </h3>
                <p>{t(kit.description, lang)}</p>
                <span className="source-tag">/svg-kits/{kit.id}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
