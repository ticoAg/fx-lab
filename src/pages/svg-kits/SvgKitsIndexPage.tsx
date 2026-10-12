import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KitSvg } from '../../components/svg-kits/KitSvg.tsx'
import { SvgKitsHeader } from '../../components/svg-kits/SvgKitsHeader.tsx'
import { defaultKitStage, writeStoredKitStage, type KitStage } from '../../components/svg-kits/stageBg.ts'
import { iconUrl, loadSvgKitViews, SVG_KIT_KIND_LABELS, SVG_KIT_KINDS, type SvgKitKind, type SvgKitViews } from '../../content/svg-kits/index.ts'
import { useSvgKits } from '../../content/svg-kits/useSvgKits.ts'
import { t, useLang } from '../../i18n.ts'
import { useTheme } from '../../ThemeProvider.tsx'

export function SvgKitsIndexPage() {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const { theme } = useTheme()
  const { data, error, loading } = useSvgKits()
  const [kind, setKind] = useState<SvgKitKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'popular' | 'default'>('popular')
  const [views, setViews] = useState<SvgKitViews | null>(null)
  const [viewsUnavailable, setViewsUnavailable] = useState(false)
  const [bg, setBg] = useState<KitStage>(() => defaultKitStage(theme))

  useEffect(() => {
    let alive = true
    loadSvgKitViews().then(
      (next) => { if (alive) setViews(next) },
      () => { if (alive) setViewsUnavailable(true) },
    )
    return () => { alive = false }
  }, [])

  useEffect(() => {
    // If user hasn't explicitly set a custom stage, coordinate with global theme
    if (!localStorage.getItem('fx-lab.svg-kits-bg')) {
      setBg(theme === 'dark' ? 'dark' : 'light')
    }
  }, [theme])

  const handleBgChange = (nextBg: KitStage) => {
    setBg(nextBg)
    writeStoredKitStage(nextBg)
  }

  const allKits = data?.themes ?? []
  const filteredKits = allKits.filter((k) => {
    if (kind !== 'all' && (k.kind ?? 'icon') !== kind) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      k.id.toLowerCase().includes(q) ||
      k.title.zh.toLowerCase().includes(q) ||
      k.title.en.toLowerCase().includes(q) ||
      k.description.zh.toLowerCase().includes(q) ||
      k.description.en.toLowerCase().includes(q)
    )
  })
  if (sort === 'popular' && views) {
    filteredKits.sort((a, b) => (views[b.id] ?? 0) - (views[a.id] ?? 0))
  }

  const grandTotal = allKits.reduce((n, k) => n + k.icons.length, 0)

  useEffect(() => {
    document.title = zh ? 'SVG 图标套件 · fx-lab' : 'SVG Kits · fx-lab'
  }, [zh])

  return (
    <div className="app kit-page" data-stage={bg}>
      <SvgKitsHeader bg={bg} onBgChange={handleBgChange} />
      <main className="kit-main">
        <section className="kit-hero">
          <div className="kit-hero-top">
            <div className="kit-hero-badge">
              <span className="kit-hero-dot" aria-hidden="true" />
              <span>{zh ? '矢量动效资源库' : 'Vector Motion Kits'}</span>
              <span className="kit-hero-subtag">v2.0</span>
            </div>
            {!loading && allKits.length > 0 && (
              <div className="kit-stats-bar">
                <span className="kit-stat-pill">
                  <strong>{allKits.length}</strong> {zh ? '个主题' : 'Themes'}
                </span>
                <span className="kit-stat-pill">
                  <strong>{grandTotal}</strong> {zh ? '个图标' : 'Icons'}
                </span>
                <span className="kit-stat-pill highlight">
                  <strong>100%</strong> {zh ? '自包含 CSS 动画' : 'Pure CSS'}
                </span>
              </div>
            )}
          </div>

          <h2 className="kit-hero-title">
            {zh ? '按主题整理的动画 SVG 图标套件' : 'Curated Animated SVG Icon Kits'}
          </h2>

          <p className="kit-hero-desc">
            {zh
              ? '单文件自包含、原生内置 CSS 动画（弹跳 / 漂浮 / 旋转 / 脉冲 / 摇摆），主描边自适应 currentColor，支持减少动态效果设置。可直接内联到页面、按钮或空状态插画。'
              : 'Standalone, self-contained animated SVG kits with pure CSS animations (pop, float, spin, pulse, sway). Adaptive currentColor strokes and prefers-reduced-motion ready.'}
          </p>
        </section>

        {!loading && allKits.length > 0 && (
          <div className="kit-toolbar-row">
            <div className="kit-seg kit-kind-filter" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={kind === 'all'}
                className={kind === 'all' ? 'active' : ''}
                onClick={() => setKind('all')}
              >
                {zh ? '全部主题' : 'All Themes'}
                <span className="seg-badge">{allKits.length}</span>
              </button>
              {SVG_KIT_KINDS.map((key) => {
                const count = allKits.filter((k) => (k.kind ?? 'icon') === key).length
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={kind === key}
                    className={kind === key ? 'active' : ''}
                    onClick={() => setKind(key)}
                  >
                    {t(SVG_KIT_KIND_LABELS[key], lang)}
                    <span className="seg-badge">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="kit-search-wrap">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                className="kit-search-input"
                placeholder={zh ? '搜索主题、图标、描述...' : 'Search themes or icons...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearch('')}
                  aria-label={zh ? '清空搜索' : 'Clear search'}
                >
                  ×
                </button>
              )}
            </div>

            <div className="kit-seg kit-kind-filter kit-sort-filter" role="group" aria-label={zh ? '主题排序' : 'Sort themes'}>
              <button type="button" className={sort === 'popular' ? 'active' : ''} aria-pressed={sort === 'popular'} onClick={() => setSort('popular')}>
                {zh ? '浏览热度' : 'Most viewed'}
              </button>
              <button type="button" className={sort === 'default' ? 'active' : ''} aria-pressed={sort === 'default'} onClick={() => setSort('default')}>
                {zh ? '默认顺序' : 'Default order'}
              </button>
            </div>
          </div>
        )}

        {viewsUnavailable && sort === 'popular' && !loading && allKits.length > 0 && (
          <p className="kit-sort-note" role="status">
            {zh ? '热度暂不可用，当前按默认顺序显示。' : 'Popularity is unavailable. Showing the default order.'}
          </p>
        )}

        {loading && (
          <div className="kit-loading-state">
            <div className="kit-spinner" aria-hidden="true" />
            <p>{zh ? '正在加载矢量套件...' : 'Loading vector kits...'}</p>
          </div>
        )}

        {error && <p className="kit-empty error-msg">{error}</p>}

        {!loading && !error && filteredKits.length === 0 && (
          <div className="kit-empty-state">
            <p>
              {search
                ? zh
                  ? `未找到与 “${search}” 相关的素材主题。`
                  : `No themes found matching “${search}”.`
                : zh
                  ? '还没有可用主题。'
                  : 'No themes yet.'}
            </p>
            {search ? (
              <button type="button" className="kit-btn ghost" onClick={() => setSearch('')}>
                {zh ? '重置搜索' : 'Reset search'}
              </button>
            ) : (
              <Link className="kit-btn" to="/svg-kits/admin">
                {zh ? '去上传主题' : 'Upload themes'}
              </Link>
            )}
          </div>
        )}

        <div className="kit-theme-grid">
          {filteredKits.map((kit) => (
            <Link key={kit.id} to={`/svg-kits/${kit.id}`} className="kit-theme-card">
              <div className="kit-theme-cover">
                <div className="kit-theme-cover-glow" aria-hidden="true" />
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
                <div className="kit-meta-header">
                  <h3 className="kit-theme-name">{t(kit.title, lang)}</h3>
                  <div className="kit-meta-badges">
                    <span className="kit-count-badge">
                      {kit.icons.length} {zh ? '图标' : 'icons'}
                    </span>
                    <span className={`kit-kind-badge kind-${kit.kind ?? 'icon'}`}>
                      {t(SVG_KIT_KIND_LABELS[kit.kind ?? 'icon'], lang)}
                    </span>
                  </div>
                </div>
                <p className="kit-theme-desc">{t(kit.description, lang)}</p>
                <div className="kit-card-footer">
                  <span className="source-tag">/svg-kits/{kit.id}</span>
                  <span className="kit-explore-hint">{zh ? '浏览全部 →' : 'View →'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
