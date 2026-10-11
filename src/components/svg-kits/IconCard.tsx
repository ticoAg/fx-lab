import { iconUrl, type SvgKitIcon } from '../../content/svg-kits/index.ts'
import { t, useLang } from '../../i18n.ts'
import { KitSvg } from './KitSvg.tsx'
import type { KitStage } from './stageBg.ts'

export function IconCard({
  themeId,
  icon,
  bg,
  onOpen,
}: {
  themeId: string
  icon: SvgKitIcon
  bg: KitStage
  onOpen: () => void
}) {
  const { lang } = useLang()
  const title = t(icon.title, lang)
  return (
    <button type="button" className="kit-icon-card" onClick={onOpen} title={t(icon.description, lang)}>
      <span className={`kit-icon-stage bg-${bg}`}>
        <KitSvg src={iconUrl(themeId, icon.id)} alt={title} />
      </span>
      <span className="kit-icon-meta">
        <strong>{title}</strong>
        <code>{icon.id}.svg</code>
      </span>
    </button>
  )
}
