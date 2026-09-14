import { useState } from 'react'
import type { MessageGameplay } from '../utils/gameplayMeta'
import { panelHasContent } from '../utils/gameplayMeta'
import {
  enabledGameplayPanels,
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

interface ChatLine {
  name: string
  text: string
}

/** 解析「昵称：内容」多行；无法解析的行并入上一条或单独成行 */
function parseChatLines(raw: string): ChatLine[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const out: ChatLine[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^(.+?)[：:]\s*(.*)$/)
    if (m) {
      out.push({ name: m[1].trim(), text: m[2] })
    } else if (out.length) {
      out[out.length - 1].text = `${out[out.length - 1].text}\n${trimmed}`
    } else {
      out.push({ name: '', text: trimmed })
    }
  }
  return out
}

function SocialChatBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  const chats = parseChatLines(value)
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium tracking-wide text-white/45">{label}</p>
      <div className="space-y-2.5">
        {chats.map((c, i) => (
          <div key={i} className="flex flex-col items-start gap-0.5">
            {c.name ? (
              <span className="px-1 text-[10px] text-white/40">{c.name}</span>
            ) : null}
            <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.08] px-3 py-2 text-[13px] leading-relaxed text-white/90 shadow-glass backdrop-blur-md">
              <p className="whitespace-pre-wrap break-words">{c.text || ' '}</p>
            </div>
          </div>
        ))}
      </div>
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
      <div className="space-y-4">
        {SOCIAL_FIELDS.map((f) => (
          <SocialChatBlock key={f.key} label={f.label} value={data.social?.[f.key]} />
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
