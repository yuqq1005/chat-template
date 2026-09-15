import { useState } from 'react'
import type { MessageGameplay } from '../utils/gameplayMeta'
import { panelHasContent } from '../utils/gameplayMeta'
import {
  enabledGameplayPanels,
  type GameplayPanelId,
  type GameplaySettings,
} from '../utils/gameplayStorage'
import './GameplayTabs.css'

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

const PANEL_META: Record<GameplayPanelId, { mark: string; ornament: string }> = {
  status: { mark: 'ÉTAT', ornament: 'journal' },
  phone: { mark: 'MÉMOIRE', ornament: 'téléphone' },
  social: { mark: 'CERCLE', ornament: 'social' },
  promises: { mark: 'PROMESSE', ornament: 'souvenir' },
}

/** 模型常把多行写成「a / b / c」，统一成换行再渲染 */
function normalizeMultiline(raw: string): string {
  const s = raw.replace(/\r\n/g, '\n').trim()
  if (!s) return s
  if (s.includes('\n')) return s
  if (/\s*[/／|｜]\s*/.test(s)) {
    return s
      .split(/\s*[/／|｜]\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join('\n')
  }
  return s
}

function FieldBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  const text = normalizeMultiline(value)
  return (
    <div className="gp-field">
      <span className="gp-field-label">{label}</span>
      <p className="gp-field-value">{text}</p>
    </div>
  )
}

interface ChatLine {
  name: string
  text: string
}

/** 解析「昵称：内容」多行；无法解析的行并入上一条或单独成行 */
function parseChatLines(raw: string): ChatLine[] {
  const normalized = normalizeMultiline(raw)
  const lines = normalized.split('\n')
  const out: ChatLine[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^(.{1,12}?)[：:]\s*(.+)$/)
    if (m && m[2]?.trim()) {
      out.push({ name: m[1]!.trim(), text: m[2].trim() })
    } else if (out.length) {
      out[out.length - 1]!.text = `${out[out.length - 1]!.text}\n${trimmed}`
    } else {
      out.push({ name: '', text: trimmed })
    }
  }
  return out
}

function SocialChatBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  const chats = parseChatLines(value)
  if (!chats.length) return null
  return (
    <div className="gp-social-block">
      <span className="gp-field-label">{label}</span>
      <div className="gp-chat-list">
        {chats.map((c, i) => (
          <div key={i} className="gp-chat-item">
            {c.name ? <span className="gp-chat-name">{c.name}</span> : null}
            <div className="gp-chat-bubble">
              <p>{c.text || ' '}</p>
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
      <div className="gp-fields">
        {STATUS_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.status?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'phone' && data.phone) {
    return (
      <div className="gp-fields">
        {PHONE_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.phone?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'social' && data.social) {
    return (
      <div className="gp-social">
        {SOCIAL_FIELDS.map((f) => (
          <SocialChatBlock key={f.key} label={f.label} value={data.social?.[f.key]} />
        ))}
      </div>
    )
  }
  if (id === 'promises' && data.promises) {
    return (
      <div className="gp-fields">
        {PROMISE_FIELDS.map((f) => (
          <FieldBlock key={f.key} label={f.label} value={data.promises?.[f.key]} />
        ))}
      </div>
    )
  }
  return <p className="gp-empty">暂无内容</p>
}

export function GameplayTabs({ gameplay, settings, loading }: GameplayTabsProps) {
  const tabs = enabledGameplayPanels(settings)
  const [active, setActive] = useState<GameplayPanelId | null>(null)

  if (!tabs.length) return null
  if (!loading && !gameplay) return null

  const openId = active && tabs.includes(active) ? active : null

  return (
    <div className="gp-tabs mt-3 w-full max-w-full space-y-2">
      <div className="gp-tabs-list">
        {tabs.map((id) => {
          const on = openId === id
          const ready = panelHasContent(gameplay, id)
          const meta = PANEL_META[id]
          return (
            <div key={id} className="gp-tab-row">
              <button
                type="button"
                disabled={loading && !ready}
                onClick={() => setActive((prev) => (prev === id ? null : id))}
                className={[
                  'gp-tab-btn',
                  on ? 'is-on' : '',
                  loading && !ready ? 'opacity-50' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {settings[id].label}
                {loading && !ready ? '…' : ''}
              </button>

              {on && gameplay && panelHasContent(gameplay, id) ? (
                <div className="gp-panel" data-panel={id}>
                  <span className="gp-panel-mark" aria-hidden>
                    {meta.mark}
                  </span>
                  <div className="gp-panel-inner">
                    <div className="gp-panel-ornament">
                      <span>{meta.ornament}</span>
                    </div>
                    <PanelBody id={id} data={gameplay} />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {loading && !gameplay ? <p className="gp-loading">玩法面板生成中…</p> : null}
    </div>
  )
}
