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
  const presets = [stageDefault, '#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e']

  return (
    <div className="kit-stroke">
      <label className="kit-stroke-picker">
        <span className="kit-stroke-title">{zh ? '描边' : 'Stroke'}</span>
        <input
          type="color"
          value={value}
          aria-label={zh ? '线条颜色' : 'Stroke color'}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <div className="kit-stroke-presets" aria-label={zh ? '常用色' : 'Preset colors'}>
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            className={`kit-swatch${value.toLowerCase() === c.toLowerCase() ? ' active' : ''}`}
            style={{ backgroundColor: c }}
            title={c === stageDefault ? (zh ? '默认主色' : 'Default ink') : c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <code>{value}</code>
      {value !== stageDefault && (
        <button type="button" className="kit-stroke-reset" onClick={() => onChange(stageDefault)}>
          {zh ? '重置' : 'Reset'}
        </button>
      )}
    </div>
  )
}
