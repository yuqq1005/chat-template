import type { MessageScene } from '../types'
import type { SceneHeaderSettings } from '../utils/characterStorage'
import './SceneMetaHeader.css'

interface SceneMetaHeaderProps {
  scene: MessageScene
  settings: SceneHeaderSettings
}

const WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const

function parseSceneClock(iso: string): {
  hour: string
  minute: string
  dateText: string
  weekday: string
} | null {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return {
    hour: h,
    minute: mi,
    dateText: `${y}.${mo}.${day}`,
    weekday: WEEKDAYS[d.getDay()] ?? '',
  }
}

function splitLocation(raw: string): { main: string; sub?: string } {
  const text = raw.trim()
  const parts = text.split(/[·•｜|／/]/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { main: parts[0]!, sub: parts.slice(1).join(' · ') }
  }
  return { main: text }
}

/** 电影感场景页眉：左时间 / 右地点，ghost-box 标签 */
export function SceneMetaHeader({ scene, settings }: SceneMetaHeaderProps) {
  if (!settings.enabled) return null

  const f = settings.fields
  const clock = f.time && scene.time ? parseSceneClock(scene.time) : null
  const locationRaw =
    f.location && scene.location?.trim() ? scene.location.trim() : ''
  const location = locationRaw ? splitLocation(locationRaw) : null
  const people = f.people && scene.people?.trim() ? scene.people.trim() : ''
  const weather =
    f.weather && scene.weather?.trim() ? scene.weather.trim() : ''
  const comment =
    f.godComment && scene.godComment?.trim() ? scene.godComment.trim() : ''

  if (!clock && !location && !people && !weather && !comment) return null

  return (
    <div className="scene-meta" aria-label="场景信息">
      <div className="scene-meta-watermark" aria-hidden>
        SCENE ARCHIVE
      </div>

      <div className="scene-meta-body">
        <div className="scene-meta-left">
          {clock ? (
            <div className="scene-meta-clock-block">
              <div className="scene-meta-clock-row">
                <span className="scene-meta-clock">
                  <span>{clock.hour}</span>
                  <span>{clock.minute}</span>
                </span>
                {clock.weekday ? (
                  <span className="scene-meta-ghost">{clock.weekday}</span>
                ) : null}
              </div>
              <div className="scene-meta-date">{clock.dateText}</div>
            </div>
          ) : null}

          {people ? (
            <div className="scene-meta-row">
              <span className="scene-meta-ghost">CHARACTER</span>
              <span className="scene-meta-row-val">{people}</span>
            </div>
          ) : null}

          {weather ? (
            <div className="scene-meta-row">
              <span className="scene-meta-ghost">SUMMARY</span>
              <span className="scene-meta-row-val is-soft">{weather}</span>
            </div>
          ) : null}

          {comment ? (
            <p className="scene-meta-comment">{comment}</p>
          ) : null}
        </div>

        {location ? (
          <div className="scene-meta-right">
            <div className="scene-meta-loc-label">LOCATION</div>
            <div className="scene-meta-loc-main">{location.main}</div>
            {location.sub ? (
              <div className="scene-meta-loc-sub">{location.sub}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
