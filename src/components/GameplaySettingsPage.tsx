import { useEffect, useState } from 'react'
import {
  DEFAULT_GAMEPLAY,
  GAMEPLAY_DECORATIONS,
  GAMEPLAY_PANEL_ORDER,
  loadGameplay,
  saveGameplay,
  type GameplayPanelId,
  type GameplaySettings,
} from '../utils/gameplayStorage'
import { FieldInput, FieldLabel, SettingsSheet } from './SettingsSheet'

interface GameplaySettingsPageProps {
  open: boolean
  onBack: () => void
  onSaved?: (settings: GameplaySettings) => void
}

const HINTS: Record<GameplayPanelId, string> = {
  status: '穿搭、动作、心情、内心OS、好感、关于你',
  phone: '通知、便签、搜索记录',
  social: '群聊摘录、可选私信',
  promises: '待完成 / 已完成的约定',
}

export function GameplaySettingsPage({ open, onBack, onSaved }: GameplaySettingsPageProps) {
  const [draft, setDraft] = useState<GameplaySettings>({ ...DEFAULT_GAMEPLAY })
  const [savedHint, setSavedHint] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(loadGameplay())
    setSavedHint(false)
  }, [open])

  const patchPanel = (id: GameplayPanelId, partial: Partial<GameplaySettings[GameplayPanelId]>) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...partial },
    }))
  }

  const handleSave = () => {
    saveGameplay(draft)
    onSaved?.(draft)
    setSavedHint(true)
    window.setTimeout(() => setSavedHint(false), 1600)
  }

  return (
    <SettingsSheet
      open={open}
      title="玩法"
      subtitle="剧情完成后二次生成；关闭的栏不会请求、也不会显示 Tab"
      onBack={onBack}
      footer={
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110"
        >
          {savedHint ? '已保存' : '保存玩法设置'}
        </button>
      }
    >
      <div className="space-y-5">
        <p className="text-[11px] leading-relaxed text-white/40">
          主模型只出剧情；启用的栏目会在消息下方出现 Tab，点开查看详细数据。栏目标题可改，花体装饰线固定。
        </p>

        {GAMEPLAY_PANEL_ORDER.map((id) => {
          const panel = draft[id]
          return (
            <section
              key={id}
              className="space-y-3 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-semibold text-white/90">
                    {DEFAULT_GAMEPLAY[id].label}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-white/40">{HINTS[id]}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={panel.enabled}
                  onClick={() => patchPanel(id, { enabled: !panel.enabled })}
                  className={[
                    'relative h-7 w-12 shrink-0 rounded-full transition',
                    panel.enabled
                      ? 'bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))]'
                      : 'bg-white/15',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 size-6 rounded-full bg-white shadow transition',
                      panel.enabled ? 'left-[1.35rem]' : 'left-0.5',
                    ].join(' ')}
                  />
                </button>
              </div>

              <div>
                <FieldLabel>显示名称</FieldLabel>
                <FieldInput
                  value={panel.label}
                  maxLength={16}
                  disabled={!panel.enabled}
                  onChange={(e) => patchPanel(id, { label: e.target.value })}
                  placeholder={DEFAULT_GAMEPLAY[id].label}
                />
              </div>

              <div>
                <FieldLabel>标题装饰（固定）</FieldLabel>
                <p className="select-none rounded-xl border border-white/8 bg-black/30 px-2 py-2 text-center text-[11px] leading-relaxed text-white/40">
                  {GAMEPLAY_DECORATIONS[id]}
                </p>
              </div>
            </section>
          )
        })}
      </div>
    </SettingsSheet>
  )
}
