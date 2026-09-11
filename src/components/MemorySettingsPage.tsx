import { useEffect, useMemo, useState } from 'react'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2'
import { loadCharacter } from '../utils/characterStorage'
import {
  getFactsByContact,
  migrateLegacyFactsIfNeeded,
  setFactStatus,
  upsertManualFact,
  type IdbMemoryFact,
} from '../utils/memoryDb'
import {
  DEFAULT_MEMORY,
  DEFAULT_MEMORY_TABLE,
  loadMemory,
  saveMemory,
  type MemorySettings,
} from '../utils/memoryStorage'
import { FieldInput, FieldLabel, FieldTextarea, SettingsSheet } from './SettingsSheet'

type FactOwnerTab = 'mine' | 'peer'

interface MemorySettingsPageProps {
  open: boolean
  onBack: () => void
  onSaved?: (settings: MemorySettings) => void
}

/** 约 10 条 FactRow 高度，超出滚轮查看 */
const FACT_LIST_MAX_H = 'max-h-[42.5rem]'

export function MemorySettingsPage({ open, onBack, onSaved }: MemorySettingsPageProps) {
  const [draft, setDraft] = useState<MemorySettings>({ ...DEFAULT_MEMORY, facts: [] })
  const [facts, setFacts] = useState<IdbMemoryFact[]>([])
  const [savedHint, setSavedHint] = useState(false)
  const [newFactText, setNewFactText] = useState('')
  const [loading, setLoading] = useState(false)
  const [factTab, setFactTab] = useState<FactOwnerTab>('peer')
  const [peerName, setPeerName] = useState('对方')
  const [userName, setUserName] = useState('我')

  const reload = async () => {
    setLoading(true)
    try {
      await migrateLegacyFactsIfNeeded()
      const mem = loadMemory()
      const card = loadCharacter()
      setDraft({ ...mem, facts: [] })
      setPeerName(card.name.trim() || '对方')
      setUserName(card.userName.trim() || '我')
      setFacts(await getFactsByContact('default', false))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSavedHint(false)
    setNewFactText('')
    setFactTab('peer')
    void reload()
  }, [open])

  const handleSave = async () => {
    const next: MemorySettings = {
      ...draft,
      facts: [],
      contextMessageCount: Math.min(200, Math.max(4, draft.contextMessageCount || 30)),
    }
    saveMemory(next)
    setDraft(next)
    onSaved?.(next)
    setSavedHint(true)
    window.setTimeout(() => setSavedHint(false), 1600)
  }

  const addFact = async () => {
    const text = newFactText.trim()
    if (!text) return
    const subject = factTab === 'mine' ? userName || '用户' : peerName || '角色'
    await upsertManualFact(text, 'default', subject)
    setNewFactText('')
    setFacts(await getFactsByContact('default', false))
  }

  const removeFact = async (id: string) => {
    await setFactStatus(id, 'inactive')
    setFacts(await getFactsByContact('default', false))
  }

  const restoreFact = async (id: string) => {
    await setFactStatus(id, 'active')
    setFacts(await getFactsByContact('default', false))
  }

  const { mineActive, peerActive, mineInactive, peerInactive } = useMemo(() => {
    const mine: IdbMemoryFact[] = []
    const peer: IdbMemoryFact[] = []
    for (const f of facts) {
      if (isUserSideFact(f, userName, peerName)) mine.push(f)
      else peer.push(f)
    }
    return {
      mineActive: mine.filter((f) => f.status === 'active'),
      peerActive: peer.filter((f) => f.status === 'active'),
      mineInactive: mine.filter((f) => f.status === 'inactive'),
      peerInactive: peer.filter((f) => f.status === 'inactive'),
    }
  }, [facts, userName, peerName])

  const activeFacts = factTab === 'mine' ? mineActive : peerActive
  const inactiveFacts = factTab === 'mine' ? mineInactive : peerInactive

  return (
    <SettingsSheet
      open={open}
      title="记忆"
      subtitle="事实存 IndexedDB；聊完一轮会由副模型自动抽取 memory_ops"
      onBack={onBack}
      footer={
        <button
          type="button"
          onClick={() => void handleSave()}
          className="w-full rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110"
        >
          {savedHint ? '已保存' : '保存记忆表与轮数'}
        </button>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold text-white/90">上下文轮数</h2>
          <p className="text-[11px] leading-relaxed text-white/40">
            每次请求只带最近 N 条消息。更早的闲聊不会进 prompt，但长期事实仍会检索注入。
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
            <span className="text-sm text-white/70">最近消息条数</span>
            <input
              type="number"
              min={4}
              max={200}
              value={draft.contextMessageCount}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  contextMessageCount: Number(e.target.value) || 30,
                }))
              }
              className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none focus:border-[var(--accent-a)]/50"
            />
          </div>
          <input
            type="range"
            min={4}
            max={120}
            step={2}
            value={Math.min(120, draft.contextMessageCount)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                contextMessageCount: Number(e.target.value),
              }))
            }
            className="w-full accent-[var(--accent-a)]"
          />
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white/90">长期事实</h2>
            <span className="text-[11px] text-white/40">
              {loading
                ? '加载中…'
                : `${activeFacts.length} 条 · 共 ${mineActive.length + peerActive.length} 有效`}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-white/40">
            存于 IndexedDB（memoryFacts）。可手动添加；聊天结束后也会自动抽取写入。
          </p>

          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/20 p-1">
            {(
              [
                { id: 'mine' as const, label: '我的', count: mineActive.length },
                { id: 'peer' as const, label: '角色的', count: peerActive.length },
              ] as const
            ).map((tab) => {
              const active = factTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFactTab(tab.id)}
                  className={[
                    'rounded-lg px-3 py-2 text-sm transition',
                    active
                      ? 'bg-white/12 font-medium text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/75',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className="ml-1 text-[11px] tabular-nums text-white/35">{tab.count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <FieldInput
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              placeholder={
                factTab === 'mine' ? `例如：${userName}不吃香菜` : `例如：${peerName}喜欢冰美式`
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addFact()
                }
              }}
            />
            <button
              type="button"
              onClick={() => void addFact()}
              aria-label="添加事实"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            >
              <HiOutlinePlus className="size-5" />
            </button>
          </div>

          <div
            className={[
              FACT_LIST_MAX_H,
              'overflow-y-auto overscroll-contain rounded-xl border border-white/8 bg-black/15 p-2',
            ].join(' ')}
          >
            {!loading && activeFacts.length === 0 && inactiveFacts.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/12 px-3 py-6 text-center text-xs text-white/35">
                {factTab === 'mine'
                  ? '还没有「我的」事实。聊到偏好/设定，或在此手动添加。'
                  : '还没有「角色的」事实。聊几轮有信息量的内容，或手动加一条。'}
              </div>
            )}

            <ul className="space-y-2">
              {activeFacts.map((fact) => (
                <FactRow key={fact.id} fact={fact} onRemove={() => void removeFact(fact.id)} />
              ))}
            </ul>

            {inactiveFacts.length > 0 && (
              <div className="space-y-2 pt-3">
                <p className="px-0.5 text-[11px] text-white/35">已失效（{inactiveFacts.length}）</p>
                {inactiveFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 opacity-50"
                  >
                    <p className="min-w-0 flex-1 truncate text-xs text-white/50 line-through">
                      {fact.factText}
                    </p>
                    <button
                      type="button"
                      onClick={() => void restoreFact(fact.id)}
                      className="shrink-0 text-[11px] text-white/45 underline-offset-2 hover:text-white/80 hover:underline"
                    >
                      恢复
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-white/90">记忆表</h2>
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({ ...prev, memoryTable: DEFAULT_MEMORY_TABLE }))
              }
              className="text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
            >
              重置模板
            </button>
          </div>
          <FieldLabel>Markdown，可手动编辑；副模型也会用 memory_diff 更新</FieldLabel>
          <FieldTextarea
            rows={14}
            value={draft.memoryTable}
            onChange={(e) => setDraft((prev) => ({ ...prev, memoryTable: e.target.value }))}
            className="font-mono text-[12px]"
          />
        </section>
      </div>
    </SettingsSheet>
  )
}

function isUserSideFact(fact: IdbMemoryFact, userName: string, peerName: string): boolean {
  const subj = (fact.subject || '').trim()
  const text = (fact.factText || '').trim()
  const userKeys = uniqueNonEmpty([userName, '用户', '我'])
  const peerKeys = uniqueNonEmpty([peerName, '角色', '对方'])

  const hit = (keys: string[], value: string) =>
    keys.some((k) => value === k || value.includes(k))

  if (subj && hit(userKeys, subj)) return true
  if (subj && hit(peerKeys, subj)) return false

  // subject 为空或是场景实体时：看正文是否明显以用户为主
  if (!subj || !hit(peerKeys, text)) {
    if (hit(userKeys, text) && !hit(peerKeys, text)) return true
  }
  return false
}

function uniqueNonEmpty(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const s = raw.trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function FactRow({ fact, onRemove }: { fact: IdbMemoryFact; onRemove: () => void }) {
  const metaType =
    (fact.metadata?.type as string | undefined) || fact.type || 'other'
  const metaScope =
    (fact.metadata?.timeScope as string | undefined) || fact.timeScope || 'long_term'

  return (
    <li className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-white/90">{fact.factText}</p>
        <p className="mt-1 text-[10px] text-white/35">
          {metaType} · {metaScope}
          {fact.subject ? ` · ${fact.subject}/${fact.predicate}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="删除事实"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition hover:bg-red-500/15 hover:text-red-300"
      >
        <HiOutlineTrash className="size-4" />
      </button>
    </li>
  )
}
