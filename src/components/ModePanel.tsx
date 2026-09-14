import { useEffect, useRef, type RefObject } from 'react'
import {
  FRESH_MODE_OPTIONS,
  MEMORY_ENGINE_OPTIONS,
  REPLY_MODE_OPTIONS,
  SCENE_HEADER_OPTIONS,
  type CharacterCard,
  type ReplyMode,
} from '../utils/characterStorage'
import { hasAnyGameplayEnabled, type GameplaySettings } from '../utils/gameplayStorage'
import { anchorPopupStyle } from '../utils/shellLayout'

const GAMEPLAY_PANEL_OPTIONS: Array<{ value: boolean; label: string; hint: string }> = [
  {
    value: true,
    label: '开启',
    hint: '消息下显示四栏并生成',
  },
  {
    value: false,
    label: '关闭',
    hint: '不显示、不请求玩法面板',
  },
]

interface ModePanelProps {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  character: CharacterCard
  gameplaySettings: GameplaySettings
  onClose: () => void
  onReplyModeChange: (mode: ReplyMode) => void
  onFreshModeChange: (enabled: boolean) => void
  onMemoryEngineChange: (enabled: boolean) => void
  onSceneHeaderChange: (enabled: boolean) => void
  onGameplayEnabledChange: (enabled: boolean) => void
  onOpenOutputSettings: () => void
}

export function ModePanel({
  open,
  anchorRef,
  character,
  gameplaySettings,
  onClose,
  onReplyModeChange,
  onFreshModeChange,
  onMemoryEngineChange,
  onSceneHeaderChange,
  onGameplayEnabledChange,
  onOpenOutputSettings,
}: ModePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  const rect = anchorRef.current?.getBoundingClientRect()
  const { top, left } = anchorPopupStyle(rect, { panelWidth: 320 })
  const gameplayOn = hasAnyGameplayEnabled(gameplaySettings)

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="模式"
      className="modal-panel fixed z-50 w-[min(320px,calc(100%-16px))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(14,16,24,0.96)] p-3 shadow-glass backdrop-blur-2xl"
      style={{ top, left }}
    >
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-[11px] font-medium tracking-wide text-white/45">输出文本</h2>
          <button
            type="button"
            onClick={() => {
              onOpenOutputSettings()
              onClose()
            }}
            className="text-[11px] text-white/40 transition hover:text-white/75"
          >
            设置文风
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {REPLY_MODE_OPTIONS.map((opt) => {
            const active = character.replyMode === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onReplyModeChange(opt.value)}
                className={[
                  'rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                    : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                ].join(' ')}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="my-3 h-px bg-white/10" />

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-medium tracking-wide text-white/45">
          普通 · 新鲜
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {FRESH_MODE_OPTIONS.map((opt) => {
            const active = character.freshMode === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onFreshModeChange(opt.value)}
                className={[
                  'rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? opt.value
                      ? 'border-amber-400/55 bg-amber-400/15 text-amber-50'
                      : 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                    : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                ].join(' ')}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="my-3 h-px bg-white/10" />

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-medium tracking-wide text-white/45">
          场景页眉
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {SCENE_HEADER_OPTIONS.map((opt) => {
            const active = character.sceneHeader.enabled === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onSceneHeaderChange(opt.value)}
                className={[
                  'rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? opt.value
                      ? 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                      : 'border-white/20 bg-white/8 text-white/80'
                    : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                ].join(' ')}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="my-3 h-px bg-white/10" />

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-medium tracking-wide text-white/45">
          玩法面板
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {GAMEPLAY_PANEL_OPTIONS.map((opt) => {
            const active = gameplayOn === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onGameplayEnabledChange(opt.value)}
                className={[
                  'rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? opt.value
                      ? 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                      : 'border-white/20 bg-white/8 text-white/80'
                    : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                ].join(' ')}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="my-3 h-px bg-white/10" />

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-medium tracking-wide text-white/45">
          后台记忆整理
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {MEMORY_ENGINE_OPTIONS.map((opt) => {
            const active = character.memoryEngineEnabled === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onMemoryEngineChange(opt.value)}
                className={[
                  'rounded-xl border px-2.5 py-2 text-left transition',
                  active
                    ? opt.value
                      ? 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                      : 'border-white/20 bg-white/8 text-white/80'
                    : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                ].join(' ')}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-white/40">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
