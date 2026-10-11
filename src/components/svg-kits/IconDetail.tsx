import { useEffect, useState } from 'react'
import { iconUrl, type SvgKitIcon, type SvgKitTheme } from '../../content/svg-kits/index.ts'
import { t, useLang } from '../../i18n.ts'
import { StageToggle } from './StageToggle.tsx'
import type { KitStage } from './stageBg.ts'
import { useSvgSource } from './useSvgSource.ts'

const ANIM_LABEL = {
  pop: { zh: '弹跳 pop', en: 'pop' },
  float: { zh: '漂浮 float', en: 'float' },
  spin: { zh: '旋转 spin', en: 'spin' },
  pulse: { zh: '脉冲 pulse', en: 'pulse' },
  sway: { zh: '摇摆 sway', en: 'sway' },
  none: { zh: '静态', en: 'static' },
} as const

export function IconDetail({
  theme,
  icon,
  bg,
  onBgChange,
  onClose,
  onPrev,
  onNext,
}: {
  theme: SvgKitTheme
  icon: SvgKitIcon
  bg: KitStage
  onBgChange: (bg: KitStage) => void
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const url = iconUrl(theme.id, icon.id)
  const { text, error } = useSvgSource(url)
  const [playing, setPlaying] = useState(true)
  const [copied, setCopied] = useState<'svg' | 'img' | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const copy = async (kind: 'svg' | 'img', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1400)
    } catch {
      setCopied(null)
    }
  }

  const category = icon.category ? theme.categories?.[icon.category] : undefined
  const imgTag = `<img src="${url}" alt="${icon.title.en}" width="80" height="80" />`

  return (
    <div className="detail" onClick={onClose}>
      <div className="detail-panel kit-detail" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-head">
          <div>
            <h2>{t(icon.title, lang)}</h2>
            <p>
              {t(theme.title, lang)}
              {category ? ` · ${t(category, lang)}` : ''} · <code>{icon.id}.svg</code>
            </p>
          </div>
          <div className="kit-detail-nav">
            <button type="button" className="back" onClick={onPrev} aria-label={zh ? '上一个' : 'Previous'}>
              ←
            </button>
            <button type="button" className="back" onClick={onNext} aria-label={zh ? '下一个' : 'Next'}>
              →
            </button>
            <button type="button" className="back" onClick={onClose}>
              {zh ? '关闭' : 'Close'}
            </button>
          </div>
        </div>

        <div className="kit-detail-body">
          <div className={`kit-preview bg-${bg}${playing ? '' : ' paused'}`}>
            {text ? (
              // Store-served SVG; inlined so the CSS animation can be paused.
              <div className="kit-preview-svg" dangerouslySetInnerHTML={{ __html: text }} />
            ) : error ? (
              <img src={url} alt={t(icon.title, lang)} />
            ) : (
              <div className="lazy-placeholder">{zh ? '加载中…' : 'Loading…'}</div>
            )}
          </div>

          <div className="kit-detail-side">
            <p className="kit-desc">{t(icon.description, lang)}</p>
            <dl className="kit-facts">
              <dt>{zh ? '动画' : 'Animation'}</dt>
              <dd>{ANIM_LABEL[icon.animation][lang]}</dd>
              <dt>{zh ? '画布' : 'viewBox'}</dt>
              <dd>0 0 80 80</dd>
              <dt>{zh ? '大小' : 'Size'}</dt>
              <dd>{text ? `${new Blob([text]).size} B` : '—'}</dd>
            </dl>

            <div className="kit-toolbar">
              <StageToggle bg={bg} onChange={onBgChange} />
              <button type="button" className="kit-btn ghost" onClick={() => setPlaying((p) => !p)}>
                {playing ? (zh ? '暂停动画' : 'Pause') : zh ? '播放动画' : 'Play'}
              </button>
            </div>

            <div className="kit-actions">
              <button type="button" className="kit-btn" disabled={!text} onClick={() => text && copy('svg', text)}>
                {copied === 'svg' ? (zh ? '已复制' : 'Copied') : zh ? '复制 SVG' : 'Copy SVG'}
              </button>
              <a className="kit-btn" href={url} download={`${theme.id}-${icon.id}.svg`}>
                {zh ? '下载 .svg' : 'Download .svg'}
              </a>
              <button type="button" className="kit-btn ghost" onClick={() => copy('img', imgTag)}>
                {copied === 'img' ? (zh ? '已复制' : 'Copied') : zh ? '复制 <img>' : 'Copy <img>'}
              </button>
            </div>
          </div>
        </div>

        {text && (
          <div className="code-wrap">
            <div className="code-toolbar">
              <span>{zh ? 'SVG 源码' : 'SVG source'}</span>
              <span>{url}</span>
            </div>
            <pre className="kit-source">
              <code>{text}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
