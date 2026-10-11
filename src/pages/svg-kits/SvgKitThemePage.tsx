import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { IconCard } from '../../components/svg-kits/IconCard.tsx'
import { IconDetail } from '../../components/svg-kits/IconDetail.tsx'
import { KitSvg } from '../../components/svg-kits/KitSvg.tsx'
import { StageToggle } from '../../components/svg-kits/StageToggle.tsx'
import { StrokePicker } from '../../components/svg-kits/StrokePicker.tsx'
import { SvgKitsHeader } from '../../components/svg-kits/SvgKitsHeader.tsx'
import {
  defaultKitStage,
  isKitStage,
  isStageDefaultStroke,
  normalizeStroke,
  readStoredKitStage,
  readStoredKitStroke,
  resolveKitStroke,
  stageDefaultStroke,
  writeStoredKitStage,
  writeStoredKitStroke,
  type KitStage,
} from '../../components/svg-kits/stageBg.ts'
import { sheetUrl, SVG_KIT_KIND_LABELS, type SvgKitIcon } from '../../content/svg-kits/index.ts'
import { useSvgKit } from '../../content/svg-kits/useSvgKits.ts'
import { t, useLang } from '../../i18n.ts'

export function SvgKitThemePage() {
  const { themeId } = useParams()
  const { theme: kit, error } = useSvgKit(themeId)
  const { lang } = useLang()
  const zh = lang === 'zh'
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const urlBg = params.get('bg')
  const bg: KitStage = isKitStage(urlBg) ? urlBg : defaultKitStage()
  const stroke = resolveKitStroke(bg, params.get('stroke'), readStoredKitStroke())
  const pageStyle = { '--svg-kit-stroke': stroke } as CSSProperties

  useEffect(() => {
    writeStoredKitStage(bg)
    writeStoredKitStroke(stroke)
    const strokeParam = stroke.slice(1)
    if (params.get('bg') === bg && params.get('stroke') === strokeParam) return
    const next = new URLSearchParams(params)
    next.set('bg', bg)
    next.set('stroke', strokeParam)
    setParams(next, { replace: true })
  }, [bg, stroke, params, setParams])

  const setBg = useCallback(
    (nextBg: KitStage) => {
      const nextStroke = isStageDefaultStroke(stroke) ? stageDefaultStroke(nextBg) : stroke
      writeStoredKitStage(nextBg)
      writeStoredKitStroke(nextStroke)
      const next = new URLSearchParams(params)
      next.set('bg', nextBg)
      next.set('stroke', nextStroke.slice(1))
      setParams(next, { replace: true })
    },
    [params, setParams, stroke],
  )

  const setStroke = useCallback(
    (nextStroke: string) => {
      const color = normalizeStroke(nextStroke)
      if (!color) return
      writeStoredKitStroke(color)
      const next = new URLSearchParams(params)
      next.set('bg', bg)
      next.set('stroke', color.slice(1))
      setParams(next, { replace: true })
    },
    [bg, params, setParams],
  )

  useEffect(() => {
    if (kit) document.title = `${t(kit.title, lang)} · SVG Kits · fx-lab`
  }, [kit, lang])

  const items = useMemo(() => {
    if (!kit) return []
    const query = q.trim().toLowerCase()
    return kit.icons.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false
      if (!query) return true
      return [i.id, i.title.zh, i.title.en, i.description.zh, i.description.en].some((s) =>
        s.toLowerCase().includes(query),
      )
    })
  }, [kit, q, cat])

  const activeId = params.get('icon')
  const active = kit?.icons.find((i) => i.id === activeId) ?? null

  const open = useCallback(
    (icon: SvgKitIcon | null) => {
      const next = new URLSearchParams(params)
      if (icon) next.set('icon', icon.id)
      else next.delete('icon')
      next.set('bg', bg)
      next.set('stroke', stroke.slice(1))
      setParams(next, { replace: true })
    },
    [bg, params, setParams, stroke],
  )

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!active) return
      const list = items.some((i) => i.id === active.id) ? items : (kit?.icons ?? [])
      const idx = list.findIndex((i) => i.id === active.id)
      open(list[(idx + dir + list.length) % list.length])
    },
    [active, items, kit, open],
  )
  const close = useCallback(() => open(null), [open])
  const prev = useCallback(() => step(-1), [step])
  const next = useCallback(() => step(1), [step])

  if (kit === undefined) {
    return (
      <div className="app kit-page" data-stage={bg} style={pageStyle}>
        <SvgKitsHeader crumb={themeId} />
        <main className="kit-main">
          <p className="kit-empty">{zh ? '加载中…' : 'Loading…'}</p>
        </main>
      </div>
    )
  }

  if (!kit) {
    return (
      <div className="app kit-page" data-stage={bg} style={pageStyle}>
        <SvgKitsHeader crumb={themeId} />
        <main className="kit-main">
          <section className="kit-hero">
            <h2>{zh ? '找不到这个主题' : 'Theme not found'}</h2>
            <p>
              {error ?? <Link to="/svg-kits">{zh ? '返回全部主题' : 'Back to all themes'}</Link>}
            </p>
          </section>
        </main>
      </div>
    )
  }

  const sheet = sheetUrl(kit)
  const categories = Object.entries(kit.categories ?? {})

  return (
    <div className="app kit-page" data-stage={bg} style={pageStyle}>
      <SvgKitsHeader crumb={t(kit.title, lang)} bg={bg} onBgChange={setBg} />
      <main className="kit-main">
        <section className="kit-hero">
          <div className="kit-hero-nav">
            <Link className="kit-back-link" to="/svg-kits">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>{zh ? '返回全部套件' : 'All kits'}</span>
            </Link>
          </div>

          <h2 className="kit-hero-title">
            {t(kit.title, lang)}
            <span className="kit-count-badge">
              {kit.icons.length} {zh ? '图标' : 'icons'}
            </span>
            <span className={`kit-kind-badge kind-${kit.kind ?? 'icon'}`}>{t(SVG_KIT_KIND_LABELS[kit.kind ?? 'icon'], lang)}</span>
          </h2>
          <p className="kit-hero-desc">{t(kit.description, lang)}</p>
        </section>

        <div className="kit-filters">
          <div className="search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={zh ? '搜索图标名称 / 描述' : 'Search icons'}
            />
          </div>
          {categories.length > 0 && (
            <div className="kit-seg">
              <button type="button" className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>
                {zh ? '全部' : 'All'}
              </button>
              {categories.map(([key, label]) => (
                <button key={key} type="button" className={cat === key ? 'active' : ''} onClick={() => setCat(key)}>
                  {t(label, lang)}
                </button>
              ))}
            </div>
          )}
          <StageToggle bg={bg} onChange={setBg} />
          <StrokePicker bg={bg} value={stroke} onChange={setStroke} />
          <span className="counter">
            {items.length} / {kit.icons.length}
          </span>
        </div>

        <div className="kit-icon-grid">
          {items.map((icon) => (
            <IconCard key={icon.id} themeId={kit.id} icon={icon} bg={bg} onOpen={() => open(icon)} />
          ))}
        </div>
        {items.length === 0 && <p className="kit-empty">{zh ? '没有匹配的图标' : 'No matching icons'}</p>}

        {sheet && (
          <section className="kit-sheet">
            <div className="kit-sheet-head">
              <h3>{zh ? '总览图' : 'Overview sheet'}</h3>
              <a className="kit-btn ghost" href={sheet} download={`${kit.id}-${kit.sheet}`}>
                {zh ? '下载总览 SVG' : 'Download sheet'}
              </a>
            </div>
            <div className={`kit-sheet-stage bg-${bg}`}>
              <KitSvg
                src={sheet}
                layout="intrinsic"
                alt={zh ? `${kit.title.zh}总览` : `${kit.title.en} overview`}
              />
            </div>
          </section>
        )}
      </main>
      {active && (
        <IconDetail
          theme={kit}
          icon={active}
          bg={bg}
          onBgChange={setBg}
          stroke={stroke}
          onStrokeChange={setStroke}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  )
}
