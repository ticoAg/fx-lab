import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { IconCard } from '../../components/svg-kits/IconCard.tsx'
import { IconDetail } from '../../components/svg-kits/IconDetail.tsx'
import { KitSvg } from '../../components/svg-kits/KitSvg.tsx'
import { StageToggle } from '../../components/svg-kits/StageToggle.tsx'
import { SvgKitsHeader } from '../../components/svg-kits/SvgKitsHeader.tsx'
import { isKitStage, readStoredKitStage, writeStoredKitStage, type KitStage } from '../../components/svg-kits/stageBg.ts'
import { sheetUrl, type SvgKitIcon } from '../../content/svg-kits/index.ts'
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
  const bg: KitStage = isKitStage(urlBg) ? urlBg : (readStoredKitStage() ?? 'dark')

  useEffect(() => {
    writeStoredKitStage(bg)
    if (params.get('bg') === bg) return
    const next = new URLSearchParams(params)
    next.set('bg', bg)
    setParams(next, { replace: true })
  }, [bg, params, setParams])

  const setBg = useCallback(
    (nextBg: KitStage) => {
      writeStoredKitStage(nextBg)
      const next = new URLSearchParams(params)
      next.set('bg', nextBg)
      setParams(next, { replace: true })
    },
    [params, setParams],
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
      setParams(next, { replace: true })
    },
    [bg, params, setParams],
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
      <div className="app kit-page" data-stage={bg}>
        <SvgKitsHeader crumb={themeId} />
        <main className="kit-main">
          <p className="kit-empty">{zh ? '加载中…' : 'Loading…'}</p>
        </main>
      </div>
    )
  }

  if (!kit) {
    return (
      <div className="app kit-page" data-stage={bg}>
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
    <div className="app kit-page" data-stage={bg}>
      <SvgKitsHeader crumb={t(kit.title, lang)} />
      <main className="kit-main">
        <section className="kit-hero">
          <h2>
            {t(kit.title, lang)}
            <span className="kit-count">
              {kit.icons.length} {zh ? '个图标' : 'icons'}
            </span>
          </h2>
          <p>{t(kit.description, lang)}</p>
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
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  )
}
