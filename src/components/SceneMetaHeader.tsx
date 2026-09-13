import type { MessageScene } from '../types'
import type { SceneHeaderSettings } from '../utils/characterStorage'
import { formatStoryTime } from '../utils/sceneMeta'

interface SceneMetaHeaderProps {
  scene: MessageScene
  settings: SceneHeaderSettings
}

/** 助手正文前的玻璃质感场景页眉（非紫色） */
export function SceneMetaHeader({ scene, settings }: SceneMetaHeaderProps) {
  if (!settings.enabled) return null

  const f = settings.fields
  const rows: Array<{ key: string; label: string; value: string }> = []

  if (f.time && scene.time) {
    rows.push({ key: 'time', label: '时间', value: formatStoryTime(scene.time) })
  }
  if (f.location && scene.location?.trim()) {
    rows.push({ key: 'location', label: '地点', value: scene.location.trim() })
  }
  if (f.people && scene.people?.trim()) {
    rows.push({ key: 'people', label: '现场', value: scene.people.trim() })
  }
  if (f.weather && scene.weather?.trim()) {
    rows.push({ key: 'weather', label: '氛围', value: scene.weather.trim() })
  }

  const comment =
    f.godComment && scene.godComment?.trim() ? scene.godComment.trim() : ''

  if (!rows.length && !comment) return null

  return (
    <div
      className="mb-2.5 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 shadow-glass backdrop-blur-xl"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 45%, rgba(180,200,220,0.06))',
      }}
    >
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-relaxed text-white/55">
          {rows.map((row) => (
            <span key={row.key} className="inline-flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-white/35">{row.label}</span>
              <span className="text-white/80">{row.value}</span>
            </span>
          ))}
        </div>
      )}
      {comment ? (
        <p
          className={[
            'text-[12px] leading-relaxed text-white/70',
            rows.length ? 'mt-1.5 border-t border-white/8 pt-1.5' : '',
          ].join(' ')}
        >
          {comment}
        </p>
      ) : null}
    </div>
  )
}
