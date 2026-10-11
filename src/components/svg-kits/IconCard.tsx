import { iconUrl, type SvgKitIcon } from '../../content/svg-kits/index.ts'
import { t, useLang } from '../../i18n.ts'

export function IconCard({ themeId, icon, onOpen }: { themeId: string; icon: SvgKitIcon; onOpen: () => void }) {
  const { lang } = useLang()
  const title = t(icon.title, lang)
  return (
    <button type="button" className="kit-icon-card" onClick={onOpen} title={t(icon.description, lang)}>
      <span className="kit-icon-stage">
        <img src={iconUrl(themeId, icon.id)} alt={title} width={80} height={80} loading="lazy" decoding="async" />
      </span>
      <span className="kit-icon-meta">
        <strong>{title}</strong>
        <code>{icon.id}.svg</code>
      </span>
    </button>
  )
}
