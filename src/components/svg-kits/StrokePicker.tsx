import { stageDefaultStroke, type KitStage } from './stageBg.ts'
import { useLang } from '../../i18n.ts'

export function StrokePicker({
  bg,
  value,
  onChange,
}: {
  bg: KitStage
  value: string
  onChange: (stroke: string) => void
}) {
  const { lang } = useLang()
  const zh = lang === 'zh'
  const stageDefault = stageDefaultStroke(bg)
  return (
    <div className="kit-stroke">
      <label>
        <span>{zh ? '线条' : 'Stroke'}</span>
        <input
          type="color"
          value={value}
          aria-label={zh ? '线条颜色' : 'Stroke color'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <code>{value}</code>
      {value !== stageDefault && (
        <button type="button" className="kit-stroke-reset" onClick={() => onChange(stageDefault)}>
          {zh ? '跟随背景' : 'Match stage'}
        </button>
      )}
    </div>
  )
}
