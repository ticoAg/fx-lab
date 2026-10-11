import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { CodeBlock } from './components/CodeBlock.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { LazyMount } from './components/LazyMount.tsx'
import { DemoMount } from './DemoMount.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import { ALL_DEMOS, SOURCE_METAS, filterDemos, type SourceMeta } from './catalog.ts'
import type { DemoItem, SourceId } from './types.ts'
import { useLang } from './i18n.ts'

export function App() {
  const [source, setSource] = useState<SourceId>('all')
  const [q, setQ] = useState('')
  const { lang } = useLang()
  const zh = lang === 'zh'
  const [active, setActive] = useState<DemoItem | null>(null)

  // Filtered list based on global query and optional source filter
  const allFilteredItems = useMemo(() => filterDemos('all', q), [q])

  // Group items by source
  const groupedItems = useMemo(() => {
    const groups: { meta: SourceMeta; items: DemoItem[] }[] = []
    for (const meta of SOURCE_METAS) {
      if (source !== 'all' && meta.id !== source) continue
      const items = allFilteredItems.filter((d) => d.source === meta.id)
      groups.push({ meta, items })
    }
    return groups
  }, [allFilteredItems, source])

  // Scroll to a specific section anchor
  const scrollToSection = (id: string) => {
    const el = document.getElementById(`sec-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && active) {
        setActive(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active])

  return (
    <div className="app gallery-app">
      <SiteHeader
        searchSlot={
          <div className="header-search-wrap">
            <svg
              className="search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={zh ? '搜索组件 / 曲线 / SDK (支持中英)...' : 'Search demos or curves...'}
            />
            {q && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setQ('')}
                aria-label={zh ? '清空搜索' : 'Clear search'}
              >
                ×
              </button>
            )}
          </div>
        }
      />

      <main className="gallery-main">
        {/* Hero Section (Direction A Editorial) */}
        <section className="gallery-hero">
          <div className="gallery-hero-main">
            <div className="gallery-hero-content">
              <div className="gallery-hero-tag">
                <span className="hero-sage-dot" aria-hidden="true" />
                <span>{zh ? '动效资源中心 · FX-LAB' : 'MOTION RESOURCE CENTER · FX-LAB'}</span>
              </div>

              <h1 className="gallery-hero-title">
                {zh ? '301 个可交互的动效组件演示' : '301 Interactive Motion & UI Components'}
              </h1>

              <p className="gallery-hero-desc">
                {zh
                  ? 'anime.js · react-bits · ThreeUI · math-curve-loaders，四个来源的官方组件挂成可试玩画廊。暖白底色与鼠尾草绿质感，按来源横向陈列，全局驱动亮暗模式。'
                  : 'anime.js, react-bits, ThreeUI, and math-curve-loaders curated into an interactive live playground. Warm editorial aesthetic with sage green accents and decoupled stage canvas.'}
              </p>
            </div>

            <div className="gallery-hero-stats-panel" aria-label="Library breakdown">
              {SOURCE_METAS.map((m) => {
                const totalCount = ALL_DEMOS.filter((d) => d.source === m.id).length
                return (
                  <div key={m.id} className="hero-stat-badge">
                    <strong>{totalCount}</strong>
                    <span>{m.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interactive Source Pills & Statistics */}
          <div className="hero-stats-row">
            <button
              type="button"
              className={`source-pill ${source === 'all' ? 'active' : ''}`}
              onClick={() => setSource('all')}
            >
              <span className="pill-name">{zh ? '全部演示' : 'All Demos'}</span>
              <span className="pill-count">{ALL_DEMOS.length}</span>
            </button>

            {SOURCE_METAS.map((m) => {
              const totalCount = ALL_DEMOS.filter((d) => d.source === m.id).length
              const matchCount = allFilteredItems.filter((d) => d.source === m.id).length
              const isSelected = source === m.id

              return (
                <button
                  key={m.id}
                  type="button"
                  className={`source-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    if (source === m.id) {
                      setSource('all')
                    } else {
                      setSource(m.id)
                      scrollToSection(m.id)
                    }
                  }}
                  style={{ '--source-accent': m.color } as React.CSSProperties}
                >
                  <span className="source-dot" style={{ backgroundColor: m.color }} aria-hidden="true" />
                  <span className="pill-name">{m.label}</span>
                  <span className="pill-count">
                    {q.trim() ? `${matchCount} / ${totalCount}` : totalCount}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Global Search Feedback Banner */}
        {q.trim() && (
          <div className="search-feedback-banner">
            <span>
              {zh
                ? `搜索关键词 “${q.trim()}”：共匹配到 ${allFilteredItems.length} 个演示`
                : `Search for “${q.trim()}”: ${allFilteredItems.length} demos found`}
            </span>
            <button type="button" className="btn-link" onClick={() => setQ('')}>
              {zh ? '重置搜索' : 'Reset search'}
            </button>
          </div>
        )}

        {/* Empty state when query matches nothing */}
        {allFilteredItems.length === 0 && (
          <div className="gallery-empty-state">
            <p>
              {zh
                ? `未找到与 “${q}” 相关的组件或演示。`
                : `No components or demos found matching “${q}”.`}
            </p>
            <button type="button" className="kit-btn ghost" onClick={() => setQ('')}>
              {zh ? '清空搜索关键词' : 'Clear search query'}
            </button>
          </div>
        )}

        {/* Structured Sections by Source (Each is a Horizontal Card Row) */}
        <div className="sections-container">
          {groupedItems.map(({ meta, items }) => {
            if (items.length === 0 && q.trim()) {
              return null
            }

            return (
              <SourceSectionRow
                key={meta.id}
                meta={meta}
                items={items}
                zh={zh}
                onSelect={setActive}
              />
            )
          })}
        </div>
      </main>

      {/* Detail Modal Overlay */}
      {active && (
        <div className="detail" onClick={() => setActive(null)}>
          <div
            className="detail-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className="detail-head">
              <div>
                <h2 id="detail-title">{zh ? active.zh : active.en}</h2>
                <p>
                  <code>{active.name}</code> · <span className="source-pill-inline">{active.source}</span>
                </p>
              </div>
              <button
                type="button"
                className="back"
                onClick={() => setActive(null)}
                aria-label={zh ? '关闭详情' : 'Close details'}
              >
                {zh ? '关闭' : 'Close'}
              </button>
            </div>

            <div className="demo-stage-lg">
              <ErrorBoundary label={active.id}>
                <DemoMount item={active} />
              </ErrorBoundary>
            </div>

            <CodeBlock code={active.code} />
          </div>
        </div>
      )}
    </div>
  )
}

interface SourceSectionRowProps {
  meta: SourceMeta
  items: DemoItem[]
  zh: boolean
  onSelect: (item: DemoItem) => void
}

function SourceSectionRow({ meta, items, zh, onSelect }: SourceSectionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const checkScroll = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = rowRef.current
    if (!el) return
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [checkScroll, items, expanded])

  const scrollByAmount = (delta: number) => {
    const el = rowRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <section
      id={`sec-${meta.id}`}
      className="gallery-source-section"
      style={{ '--source-accent': meta.color } as React.CSSProperties}
    >
      {/* Section Header */}
      <div className="section-header">
        <div className="section-header-left">
          <div className="section-tag-row">
            <span className="section-badge" style={{ borderColor: meta.color, color: meta.color }}>
              {meta.tag}
            </span>
            <span className="section-count-badge">
              {items.length} {zh ? '个演示' : 'demos'}
            </span>
          </div>
          <h2 className="section-title">
            {zh ? meta.title.zh : meta.title.en}
          </h2>
          <p className="section-desc">
            {zh ? meta.desc.zh : meta.desc.en}
          </p>
        </div>

        <div className="section-header-right">
          {!expanded && (
            <div className="row-scroll-controls" aria-label="Horizontal scroll controls">
              <button
                type="button"
                className="row-nav-btn prev"
                onClick={() => scrollByAmount(-580)}
                disabled={!canScrollLeft}
                title={zh ? '向左滑动' : 'Scroll left'}
                aria-label={zh ? '向左滑动' : 'Scroll left'}
              >
                ‹
              </button>
              <button
                type="button"
                className="row-nav-btn next"
                onClick={() => scrollByAmount(580)}
                disabled={!canScrollRight}
                title={zh ? '向右滑动' : 'Scroll right'}
                aria-label={zh ? '向右滑动' : 'Scroll right'}
              >
                ›
              </button>
            </div>
          )}

          <button
            type="button"
            className="row-expand-toggle-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? (zh ? '收起为横向卡片行' : 'Collapse to row') : (zh ? '展开为全网格' : 'Expand full grid')}
          >
            {expanded
              ? (zh ? '收起为横行 ↑' : 'Show as row ↑')
              : (zh ? `查看全部 (${items.length}) →` : `View all (${items.length}) →`)}
          </button>

          <button
            type="button"
            className="section-scroll-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            title={zh ? '返回顶部' : 'Back to top'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
            <span>{zh ? '顶部' : 'Top'}</span>
          </button>
        </div>
      </div>

      {/* Section Content: Horizontal Card Row or Expanded Grid */}
      {expanded ? (
        <div className="grid section-card-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className="demo-card"
              onClick={() => onSelect(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(item)
                }
              }}
            >
              <LazyMount webgl={item.webgl} className="demo-stage">
                <ErrorBoundary label={item.id}>
                  <DemoMount item={item} preview />
                </ErrorBoundary>
              </LazyMount>

              <div className="card-meta">
                <div className="card-meta-top">
                  <h3>
                    <button
                      type="button"
                      className="card-open"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item)
                      }}
                    >
                      {zh ? item.zh : item.en}
                    </button>
                  </h3>
                  <span className="source-tag">{item.source}</span>
                </div>
                <p className="card-slug">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-card-row-wrapper">
          <div
            className="section-card-row"
            ref={rowRef}
            onScroll={checkScroll}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="demo-card row-card"
                onClick={() => onSelect(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
              >
                <LazyMount webgl={item.webgl} className="demo-stage">
                  <ErrorBoundary label={item.id}>
                    <DemoMount item={item} preview />
                  </ErrorBoundary>
                </LazyMount>

                <div className="card-meta">
                  <div className="card-meta-top">
                    <h3>
                      <button
                        type="button"
                        className="card-open"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(item)
                        }}
                      >
                        {zh ? item.zh : item.en}
                      </button>
                    </h3>
                    <span className="source-tag">{item.source}</span>
                  </div>
                  <p className="card-slug">{item.name}</p>
                </div>
              </div>
            ))}

            {items.length > 5 && (
              <div
                className="row-expand-card"
                onClick={() => setExpanded(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpanded(true)
                  }
                }}
                title={zh ? `展开此分区的全部 ${items.length} 个演示` : `Expand all ${items.length} demos`}
              >
                <div className="row-expand-inner">
                  <span className="row-expand-plus" aria-hidden="true">+</span>
                  <strong>{zh ? `查看全部 ${items.length} 个` : `View all ${items.length}`}</strong>
                  <small>{zh ? `${meta.label} 演示 →` : `${meta.label} demos →`}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
