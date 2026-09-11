import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { HiOutlineChevronLeft } from 'react-icons/hi2'

interface SettingsSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onBack: () => void
  footer?: ReactNode
  children: ReactNode
}

export function SettingsSheet({
  open,
  title,
  subtitle,
  onBack,
  footer,
  children,
}: SettingsSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[rgba(8,10,16,0.72)] backdrop-blur-md">
      <div className="modal-panel flex h-full w-full flex-col bg-[rgba(12,14,20,0.92)]">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回"
            className="flex size-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <HiOutlineChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[16px] font-semibold text-white">{title}</h1>
            {subtitle && <p className="truncate text-[11px] text-white/40">{subtitle}</p>}
          </div>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs text-white/50">{children}</span>
}

export function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent-a)]/50',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

export function FieldTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent-a)]/50',
        props.className ?? '',
      ].join(' ')}
    />
  )
}
