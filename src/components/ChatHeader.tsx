import { useRef, type RefObject } from 'react'
import {
  HiOutlineChevronDown,
  HiOutlineCog6Tooth,
  HiOutlineMusicalNote,
  HiOutlineSun,
  HiOutlineTrash,
} from 'react-icons/hi2'

interface ChatHeaderProps {
  /** 新鲜模式开启时，「模式」按钮变黄 */
  freshMode?: boolean
  modeOpen?: boolean
  onModeClick?: () => void
  modeButtonRef?: RefObject<HTMLButtonElement | null>
  themeOpen?: boolean
  onThemeClick?: () => void
  themeButtonRef?: RefObject<HTMLButtonElement | null>
  musicOpen?: boolean
  onMusicClick?: () => void
  musicButtonRef?: RefObject<HTMLButtonElement | null>
  settingsOpen?: boolean
  onSettingsClick?: () => void
  settingsButtonRef?: RefObject<HTMLButtonElement | null>
  /** 清除 IndexedDB（测试用） */
  onClearIdbClick?: () => void
  clearIdbBusy?: boolean
}

export function ChatHeader({
  freshMode,
  modeOpen,
  onModeClick,
  modeButtonRef,
  themeOpen,
  onThemeClick,
  themeButtonRef,
  musicOpen,
  onMusicClick,
  musicButtonRef,
  settingsOpen,
  onSettingsClick,
  settingsButtonRef,
  onClearIdbClick,
  clearIdbBusy,
}: ChatHeaderProps) {
  const localModeRef = useRef<HTMLButtonElement>(null)
  const localThemeRef = useRef<HTMLButtonElement>(null)
  const localMusicRef = useRef<HTMLButtonElement>(null)
  const localSettingsRef = useRef<HTMLButtonElement>(null)
  const modeRef = modeButtonRef ?? localModeRef
  const themeRef = themeButtonRef ?? localThemeRef
  const musicRef = musicButtonRef ?? localMusicRef
  const settingsRef = settingsButtonRef ?? localSettingsRef

  return (
    <header className="relative z-20 flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 backdrop-blur-xl">
      <button
        ref={modeRef}
        type="button"
        title="模式"
        aria-expanded={modeOpen}
        aria-haspopup="dialog"
        onClick={onModeClick}
        className={[
          'flex items-center gap-1 rounded-full border px-3 py-1.5 text-left transition',
          freshMode
            ? 'border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300'
            : modeOpen
              ? 'border-white/20 bg-white/12 text-white'
              : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white',
        ].join(' ')}
      >
        <span className="text-[13px] font-medium tracking-wide">模式</span>
        <HiOutlineChevronDown
          className={[
            'size-3.5 shrink-0 transition-transform',
            freshMode ? 'opacity-80' : 'opacity-60',
            modeOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          title="清除 IndexedDB（测试）"
          disabled={clearIdbBusy}
          onClick={onClearIdbClick}
          className="flex size-9 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
        >
          <HiOutlineTrash className="size-5" />
        </button>
        <button
          ref={musicRef}
          type="button"
          title="音乐"
          aria-expanded={musicOpen}
          aria-haspopup="dialog"
          onClick={onMusicClick}
          className={[
            'flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10 hover:text-white',
            musicOpen ? 'bg-white/10 text-white' : 'text-white/55',
          ].join(' ')}
        >
          <HiOutlineMusicalNote className="size-5" />
        </button>
        <button
          ref={themeRef}
          type="button"
          title="主题"
          aria-expanded={themeOpen}
          aria-haspopup="dialog"
          onClick={onThemeClick}
          className={[
            'flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10 hover:text-white',
            themeOpen ? 'bg-white/10 text-white' : 'text-white/55',
          ].join(' ')}
        >
          <HiOutlineSun className="size-5" />
        </button>
        <button
          ref={settingsRef}
          type="button"
          title="设置"
          aria-expanded={settingsOpen}
          aria-haspopup="menu"
          onClick={onSettingsClick}
          className={[
            'flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10 hover:text-white',
            settingsOpen ? 'bg-white/10 text-white' : 'text-white/55',
          ].join(' ')}
        >
          <HiOutlineCog6Tooth className="size-5" />
        </button>
      </div>
    </header>
  )
}
