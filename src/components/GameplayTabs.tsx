import { useState } from 'react'
import type { MessageGameplay } from '../utils/gameplayMeta'
import { panelHasContent } from '../utils/gameplayMeta'
import {
  enabledGameplayPanels,
  GAMEPLAY_DECORATIONS,
  type GameplayPanelId,
  type GameplaySettings,
} from '../utils/gameplayStorage'

interface GameplayTabsProps {
  gameplay?: MessageGameplay
  settings: GameplaySettings
  /** 剧情已出、玩法仍在请求 */
  loading?: boolean
}

const STATUS_FIELDS: Array<{ key: keyof NonNullable<MessageGameplay['status']>; label: string }> =
  [
    { key: 'outfit', label: '穿搭' },
    { key: 'action', label: '动作' },
    { key: 'mood', label: '心情' },
    { key: 'innerOs', label: '内心OS' },
    { key: 'affection', label: '好感' },
    { key: 'aboutYou', label: '关于你' },
  ]

const PHONE_FIELDS: Array<{ key: keyof NonNullable<MessageGameplay['phone']>; label: string }> = [
  { key: 'notices', label: '通知' },
  { key: 'notes', label: '便签' },
  { key: 'searches', label: '搜索记录' },
]

const SOCIAL_FIELDS: Array<{ key: keyof NonNullable<MessageGameplay['social']>; label: string }> =
  [
    { key: 'groupChat', label: '群聊' },
    { key: 'dm', label: '私信' },
  ]

const PROMISE_FIELDS: Array<{
  key: keyof NonNullable<MessageGameplay['promises']>
  label: string
}> = [
  { key: 'pending', label: '待完成' },
  { key: 'done', label: '已完成' },
]

function FieldBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-white/45">{label}</p>
      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
        {value}
      </p>
    </div>
  )
}

function PanelBody({ id, data }: { id: GameplayPanelId; data: MessageGameplay }) {
  if (id === 'status' && data.status) {
    return (
      <div className="space-y-3">
        {STATUS_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.status?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'phone' && data.phone) {
    return (
      <div className="space-y-3">
        {PHONE_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.phone?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'social' && data.social) {
    return (
      <div className="space-y-3">
        {SOCIAL_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.social?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'promises' && data.promises) {
    return (
      <div className="space-y-3">
        {PROMISE_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.promises?.[f.key]} />
        ))}
      </div>
    )
  }
  return <p className="text-[12px] text-white/40">暂无内容</p>
}

export function GameplayTabs({ gameplay, settings, loading }: GameplayTabsProps) {
  const tabs = enabledGameplayPanels(settings)
  const [active, setActive] = useState<GameplayPanelId | null>(null)

  if (!tabs.length) return null
  if (!loading && !gameplay) return null

  const openId = active && tabs.includes(active) ? active : null

  return (
    <div className="mt-3 w-full max-w-full space-y-2">
      <div className="flex w-full flex-col items-center gap-1">
        {tabs.map((id) => {
          const on = openId === id
          const ready = panelHasContent(gameplay, id)
          return (
            <div key={id} className="flex w-full flex-col items-center gap-2">
              <button
                type="button"
                disabled={loading && !ready}
                onClick={() => setActive((prev) => (prev === id ? null : id))}
                className={[
                  'bg-transparent px-0 py-0.5 text-center text-[12px] transition',
                  on ? 'text-white' : 'text-white/55 hover:text-white/85',
                  loading && !ready ? 'opacity-50' : '',
                ].join(' ')}
              >
                {settings[id].label}
                {loading && !ready ? '…' : ''}
              </button>

              {on && gameplay && panelHasContent(gameplay, id) ? (
                <div className="w-full rounded-2xl border border-white/10 bg-black/35 px-3.5 py-3 shadow-glass backdrop-blur-md">
                  <p className="mb-2 select-none text-center text-[11px] leading-relaxed tracking-wide text-white/35">
                    {GAMEPLAY_DECORATIONS[id]}
                  </p>
                  <p className="mb-3 text-center text-[12px] font-medium text-white/70">
                    {settings[id].label}
                  </p>
                  <PanelBody id={id} data={gameplay} />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {loading && !gameplay ? (
        <p className="text-center text-[11px] text-white/35">玩法面板生成中…</p>
      ) : null}
    </div>
  )
}
