import { KIT_STAGE_LABEL, KIT_STAGES, type KitStage } from './stageBg.ts'
import { useLang } from '../../i18n.ts'

export function StageToggle({ bg, onChange }: { bg: KitStage; onChange: (bg: KitStage) => void }) {
  const { lang } = useLang()
  const zh = lang === 'zh'
  return (
    <div className="kit-seg kit-stage-toggle" role="group" aria-label={zh ? '背景风格' : 'Stage background'}>
      {KIT_STAGES.map((stage) => {
        const item = KIT_STAGE_LABEL[stage]
        return (
          <button
            key={stage}
            type="button"
            className={bg === stage ? 'active' : ''}
            onClick={() => onChange(stage)}
            title={item[lang]}
            aria-pressed={bg === stage}
          >
            <span className="stage-emoji" aria-hidden="true">{item.icon}</span>
            <span className="stage-label">{item[lang]}</span>
          </button>
        )
      })}
    </div>
  )
}
