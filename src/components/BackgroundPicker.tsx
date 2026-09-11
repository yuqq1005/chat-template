import { useEffect, useRef, useState, type RefObject } from 'react'
import { HiOutlinePlus } from 'react-icons/hi2'
import {
  DEFAULT_BG_PRESET,
  type BgAdjust,
  type BgSettings,
  type BgSource,
} from '../utils/bgSettings'
import boyfriendBg from '../assets/boyfriend.jpg'
import { anchorPopupStyle } from '../utils/shellLayout'

interface BackgroundPickerProps {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  settings: BgSettings
  defaultPreviewUrl?: string
  onChange: (next: BgSettings) => void
  onClose: () => void
}

const ADJUST_TABS: { id: BgAdjust; label: string }[] = [
  { id: 'default', label: '默认' },
  { id: 'immerse', label: '沉浸' },
  { id: 'focus', label: '专注' },
  { id: 'custom', label: '自定义' },
]

export function BackgroundPicker({
  open,
  anchorRef,
  settings,
  defaultPreviewUrl = boyfriendBg,
  onChange,
  onClose,
}: BackgroundPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState({ top: 56, right: 16 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const { top, right } = anchorPopupStyle(rect, { panelWidth: 320 })
    setPos({ top, right })
  }, [open, anchorRef])

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

  const selectSource = (source: BgSource) => {
    if (source === 'custom' && !settings.customUrl) {
      fileRef.current?.click()
      return
    }
    onChange({ ...settings, source })
  }

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (settings.customUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(settings.customUrl)
    }
    const url = URL.createObjectURL(file)
    onChange({ ...settings, source: 'custom', customUrl: url })
  }

  const previewDefault = defaultPreviewUrl || DEFAULT_BG_PRESET
  const previewCustom = settings.customUrl

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="背景设置"
      className="modal-panel fixed z-50 w-[320px] rounded-xl border border-white/12 bg-[rgba(18,20,28,0.92)] px-4 py-3 text-white shadow-glass backdrop-blur-2xl"
      style={{ top: pos.top, right: pos.right }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">动态背景</div>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {/* 默认背景 */}
            <div className="flex flex-col items-center overflow-hidden">
              <button
                type="button"
                onClick={() => selectSource('default')}
                className={[
                  'flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 p-1 transition',
                  settings.source === 'default'
                    ? 'border-[var(--accent-a)]'
                    : 'border-transparent hover:border-white/20',
                ].join(' ')}
              >
                <img
                  src={previewDefault}
                  alt="默认背景"
                  className="h-[72px] w-full rounded-xl object-cover"
                />
              </button>
              <div className="mt-2 flex items-center space-x-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.source === 'default'}
                  onClick={() => selectSource('default')}
                  className={[
                    'flex size-4 shrink-0 items-center justify-center rounded-full border shadow-xs transition',
                    settings.source === 'default'
                      ? 'border-white bg-white/20'
                      : 'border-[#B7B8BD26] bg-white/5',
                  ].join(' ')}
                >
                  {settings.source === 'default' && (
                    <span className="size-2 rounded-full bg-white" />
                  )}
                </button>
                <label
                  className="cursor-pointer text-xs font-normal text-white/55"
                  onClick={() => selectSource('default')}
                >
                  默认背景
                </label>
              </div>
            </div>

            {/* 自定义背景 */}
            <div className="flex flex-col items-center overflow-hidden">
              <div
                className={[
                  'relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 p-1 transition',
                  settings.source === 'custom'
                    ? 'border-[var(--accent-a)]'
                    : 'border-transparent hover:border-white/20',
                ].join(' ')}
              >
                {previewCustom ? (
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => selectSource('custom')}
                  >
                    <img
                      src={previewCustom}
                      alt="自定义背景"
                      className="h-[72px] w-full rounded-xl object-cover"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-[72px] w-full flex-col items-center justify-center rounded-xl bg-zinc-800"
                    onClick={() => fileRef.current?.click()}
                  >
                    <HiOutlinePlus className="size-6 text-white/30" strokeWidth={2} />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.source === 'custom'}
                  onClick={() => selectSource('custom')}
                  className={[
                    'flex size-4 shrink-0 items-center justify-center rounded-full border shadow-xs transition',
                    settings.source === 'custom'
                      ? 'border-white bg-white/20'
                      : 'border-[#B7B8BD26] bg-white/5',
                  ].join(' ')}
                >
                  {settings.source === 'custom' && (
                    <span className="size-2 rounded-full bg-white" />
                  )}
                </button>
                <label
                  className="cursor-pointer text-xs font-normal text-white/55"
                  onClick={() => selectSource('custom')}
                >
                  自定义背景
                </label>
                {previewCustom && (
                  <button
                    type="button"
                    className="text-[10px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
                    onClick={() => fileRef.current?.click()}
                  >
                    更换
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="text-sm font-medium">背景调节</div>
          <nav className="grid h-9 grid-cols-4 gap-1 rounded-[10px] bg-black/20 p-1">
            {ADJUST_TABS.map((tab) => {
              const active = settings.adjust === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange({ ...settings, adjust: tab.id })}
                  className={[
                    'rounded-[10px] text-sm transition-colors',
                    active ? 'bg-white/25 text-white' : 'text-white/40 hover:text-white/70',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
