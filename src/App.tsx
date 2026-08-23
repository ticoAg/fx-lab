import { useMemo, useState } from 'react'
import { CodeBlock } from './components/CodeBlock.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { LazyMount } from './components/LazyMount.tsx'
import { DemoMount } from './DemoMount.tsx'
import { ALL_DEMOS, SOURCES, filterDemos } from './catalog.ts'
import type { DemoItem, SourceId } from './types.ts'

export function App() {
  const [source, setSource] = useState<SourceId>('all')
  const [q, setQ] = useState('')
  const [lang, setLang] = useState<'zh' | 'en'>('zh')
  const [active, setActive] = useState<DemoItem | null>(null)

  const items = useMemo(() => filterDemos(source, q), [source, q])

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <h1>运动实验室</h1>
          <small>fx-lab · 官方 SDK</small>
        </div>
        <a className="dict-link" href="http://127.0.0.1:8080/">
          返回词典
        </a>
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'zh' ? '搜索组件 / 曲线 / SDK' : 'Search demos'}
          />
        </div>
        <div className="counter">
          {items.length} / {ALL_DEMOS.length}
        </div>
        <div className="lang-toggle">
          <button type="button" className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
            中
          </button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            EN
          </button>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <h2>{lang === 'zh' ? '来源' : 'Source'}</h2>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={source === s.id ? 'active' : ''}
              onClick={() => setSource(s.id)}
            >
              {s.label}
            </button>
          ))}
        </aside>
        <main className="content">
          <div className="grid">
            {items.map((item) => (
              <button key={item.id} type="button" className="card" onClick={() => setActive(item)}>
                <LazyMount webgl={item.webgl} className="stage">
                  <ErrorBoundary label={item.id}>
                    <DemoMount item={item} />
                  </ErrorBoundary>
                </LazyMount>
                <div className="card-meta">
                  <h3>{lang === 'zh' ? item.zh : item.en}</h3>
                  <p>{item.name}</p>
                  <span className="source-tag">{item.source}</span>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
      {active && (
        <div className="detail" onClick={() => setActive(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-head">
              <div>
                <h2>{lang === 'zh' ? active.zh : active.en}</h2>
                <p>
                  {active.name} · {active.source}
                </p>
              </div>
              <button type="button" className="back" onClick={() => setActive(null)}>
                {lang === 'zh' ? '返回画廊' : 'Back'}
              </button>
            </div>
            <div className="stage-lg">
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
