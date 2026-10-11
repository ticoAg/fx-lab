import { Link } from 'react-router-dom'
import { SiteHeader } from '../SiteHeader.tsx'
import { StageToggle } from './StageToggle.tsx'
import type { KitStage } from './stageBg.ts'
import { useLang } from '../../i18n.ts'

export function SvgKitsHeader({
  crumb,
  bg,
  onBgChange,
}: {
  crumb?: string
  bg?: KitStage
  onBgChange?: (bg: KitStage) => void
}) {
  const { lang } = useLang()
  const zh = lang === 'zh'

  return (
    <SiteHeader
      crumb={crumb}
      stageSlot={bg && onBgChange ? <StageToggle bg={bg} onChange={onBgChange} /> : undefined}
      actionSlot={
        <Link className="nav-btn nav-btn-subtle" to="/svg-kits/admin" title={zh ? '上传 / 管理新主题' : 'Upload themes'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>{zh ? '上传' : 'Upload'}</span>
        </Link>
      }
    />
  )
}
