import { KIT_STAGE_LABEL, KIT_STAGES, type KitStage } from './stageBg.ts'
import { useLang } from '../../i18n.ts'

export function StageToggle({ bg, onChange }: { bg: KitStage; onChange: (bg: KitStage) => void }) {
  const { lang } = useLang()
  const zh = lang === 'zh'
  return (
    <div className="kit-seg" role="group" aria-label={zh ? '背景' : 'Background'}>
      {KIT_STAGES.map((stage) => (
        <button
          key={stage}
          type="button"
          className={bg === stage ? 'active' : ''}
          onClick={() => onChange(stage)}
        >
          {KIT_STAGE_LABEL[stage][lang]}
        </button>
      ))}
    </div>
  )
}
