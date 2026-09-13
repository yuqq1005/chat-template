import { useEffect, useRef, type RefObject } from 'react'
import { HiOutlineChevronRight, HiOutlineCircleStack, HiOutlineSparkles } from 'react-icons/hi2'
import { anchorPopupStyle } from '../utils/shellLayout'

export type SettingsPageId = 'character' | 'memory'

interface SettingsMenuProps {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSelect: (page: SettingsPageId) => void
}

const ITEMS: {
  id: SettingsPageId
  title: string
  desc: string
  icon: typeof HiOutlineSparkles
}[] = [
  {
    id: 'character',
    title: '文风与角色',
    desc: '角色卡、文风、场景页眉',
    icon: HiOutlineSparkles,
  },
  {
    id: 'memory',
    title: '记忆',
    desc: '记忆表、长期事实、上下文轮数',
    icon: HiOutlineCircleStack,
  },
]

export function SettingsMenu({ open, anchorRef, onClose, onSelect }: SettingsMenuProps) {
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
  const { top, right } = anchorPopupStyle(rect, { panelWidth: 280 })

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="设置"
      className="modal-panel fixed z-50 w-[min(280px,calc(100%-16px))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(14,16,24,0.94)] p-1.5 shadow-glass backdrop-blur-2xl"
      style={{ top, right }}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onSelect(item.id)
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/8"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80">
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-white">{item.title}</span>
              <span className="mt-0.5 block text-[11px] text-white/40">{item.desc}</span>
            </span>
            <HiOutlineChevronRight className="size-4 shrink-0 text-white/30" />
          </button>
        )
      })}
    </div>
  )
}
