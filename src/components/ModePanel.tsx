import { useEffect, useRef, type RefObject } from 'react'
import {
  FRESH_MODE_OPTIONS,
  REPLY_MODE_OPTIONS,
  type CharacterCard,
  type ReplyMode,
} from '../utils/characterStorage'

interface ModePanelProps {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  character: CharacterCard
  onClose: () => void
  onReplyModeChange: (mode: ReplyMode) => void
  onFreshModeChange: (enabled: boolean) => void
  onOpenOutputSettings: () => void
}

export function ModePanel({
  open,
  anchorRef,
  character,
  onClose,
  onReplyModeChange,
  onFreshModeChange,
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
  const top = rect ? rect.bottom + 8 : 56
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - 328)) : 16

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="模式"
      className="modal-panel fixed z-50 w-[min(320px,calc(100vw-16px))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(14,16,24,0.96)] p-3 shadow-glass backdrop-blur-2xl"
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
    </div>
  )
}
