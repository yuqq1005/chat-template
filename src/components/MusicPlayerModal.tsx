import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  HiOutlinePlus,
  HiOutlineSpeakerWave,
  HiOutlineSpeakerXMark,
  HiOutlineTrash,
} from 'react-icons/hi2'
import boyfriendBg from '../assets/boyfriend.jpg'
import {
  DEFAULT_CHARACTER_AVATAR,
  DEFAULT_USER_AVATAR,
} from '../utils/characterStorage'
import {
  addMusicTrackFromFile,
  loadMusicPlaylist,
  removeMusicTrack,
  type MusicTrack,
} from '../utils/musicDb'

const VOLUME_KEY = 'kulan.chat.music.volume'

export type Track = MusicTrack

const BUBBLE_TEXTS = [
  '我寻遍了这世间，再没遇见过如你一般的人。',
  '曾是漂泊的灵魂，不知不觉间，已与你紧紧相认。',
  '只要你点头说句“我愿意”，我亲爱的。',
  '我愿在你面前倾注所有真心，我亲爱的。',
  '来吧，是啊，此生无论生死都愿与你相随。',
]

const EMPTY_BUBBLE = '还没有音乐，点下方上传吧～'

const TALK_LEFT = ['发如月光的你，来牵走我的心吧。', '亲密值₊₅+5⁺⁵', '发如月光的你，告诉我你心底的话吧。']
const TALK_RIGHT = ['好感₊₁+1⁺¹', '不许拍啦', '戳我干嘛...']

/** 0 list · 1 single · 2 shuffle */
type PlayMode = 0 | 1 | 2

const MODE_PATHS: Record<PlayMode, string> = {
  0: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  1: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
  2: 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
}

const PLAY_PATH = 'M8 5v14l11-7z'
const PAUSE_PATH = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m < 10 ? `0${m}` : m}:${sec < 10 ? `0${sec}` : sec}`
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function stripExt(name: string) {
  return name.replace(AUDIO_EXT, '')
}

function isAudioFile(file: File) {
  return file.type.startsWith('audio/') || AUDIO_EXT.test(file.name)
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw == null) return 0.75
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0.75
    return Math.max(0, Math.min(1, n))
  } catch {
    return 0.75
  }
}

interface MusicPlayerModalProps {
  open: boolean
  onClose: () => void
  /** 「我的」头像 */
  userAvatar?: string
  /** 角色头像 */
  peerAvatar?: string
}

export function MusicPlayerModal({
  open,
  onClose,
  userAvatar = DEFAULT_USER_AVATAR,
  peerAvatar = DEFAULT_CHARACTER_AVATAR,
}: MusicPlayerModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const volWrapRef = useRef<HTMLDivElement>(null)
  const volTrackRef = useRef<HTMLDivElement>(null)

  const [tracks, setTracks] = useState<Track[]>([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<PlayMode>(0)
  const [bubble, setBubble] = useState(EMPTY_BUBBLE)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(loadVolume)
  const [volOpen, setVolOpen] = useState(false)
  const [talk, setTalk] = useState<{ side: 'left' | 'right'; text: string } | null>(null)
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevVolumeRef = useRef(volume > 0 ? volume : 0.75)

  const hasTracks = tracks.length > 0
  const tracksRef = useRef(tracks)
  const modeRef = useRef(mode)
  const indexRef = useRef(index)
  tracksRef.current = tracks
  modeRef.current = mode
  indexRef.current = index

  const loadTrack = useCallback((idx: number, autoPlay: boolean, list = tracksRef.current) => {
    const audio = audioRef.current
    const track = list[idx]
    if (!audio || !track) return

    setIndex(idx)
    setBubble(pick(BUBBLE_TEXTS))
    setCurrent(0)
    setDuration(0)
    audio.src = track.url
    audio.load()

    if (autoPlay) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [])

  const stopAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
    setBubble(EMPTY_BUBBLE)
  }, [])

  const changeTrack = useCallback(
    (dir: number) => {
      const list = tracksRef.current
      if (!list.length) return
      let next = indexRef.current
      if (modeRef.current === 2) {
        next = Math.floor(Math.random() * list.length)
      } else {
        next += dir
        if (next < 0) next = list.length - 1
        if (next >= list.length) next = 0
      }
      loadTrack(next, true, list)
    },
    [loadTrack],
  )

  // 从独立 KulanMusicDB 恢复歌单（清聊天不会删）
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await loadMusicPlaylist()
        if (cancelled) {
          list.forEach((t) => {
            if (t.url.startsWith('blob:')) URL.revokeObjectURL(t.url)
          })
          return
        }
        setTracks(list)
        if (list.length) {
          queueMicrotask(() => loadTrack(0, true, list))
        }
      } catch (e) {
        console.warn('[音乐] 加载歌单失败:', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadTrack])

  // audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrent(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      if (modeRef.current === 1) {
        audio.currentTime = 0
        void audio.play().catch(() => {})
        return
      }
      changeTrack(1)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [changeTrack])

  // scroll active track into view
  useEffect(() => {
    if (!hasTracks) return
    const item = listRef.current?.querySelector(`[data-track-idx="${index}"]`) as HTMLElement | null
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [index, open, hasTracks])

  // escape / backdrop
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (volOpen) setVolOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, volOpen])

  // sync audio volume
  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
    try {
      localStorage.setItem(VOLUME_KEY, String(volume))
    } catch {
      /* ignore */
    }
    if (volume > 0) prevVolumeRef.current = volume
  }, [volume])

  // close volume popover when modal closes
  useEffect(() => {
    if (!open) setVolOpen(false)
  }, [open])

  // 打开面板时若已有曲目但未在播（例如首屏自动播放被浏览器拦截），再尝试播放
  useEffect(() => {
    if (!open) return
    const audio = audioRef.current
    const list = tracksRef.current
    if (!audio || !list.length) return
    if (!audio.src) {
      loadTrack(indexRef.current, true, list)
      return
    }
    if (audio.paused) {
      void audio.play().catch(() => {})
    }
  }, [open, loadTrack])

  // click outside volume popover
  useEffect(() => {
    if (!volOpen) return
    const onPointer = (e: globalThis.MouseEvent) => {
      if (volWrapRef.current?.contains(e.target as Node)) return
      setVolOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [volOpen])

  useEffect(() => {
    return () => {
      if (talkTimer.current) clearTimeout(talkTimer.current)
      tracksRef.current.forEach((t) => {
        if (t.url.startsWith('blob:')) URL.revokeObjectURL(t.url)
      })
    }
  }, [])

  const applyVolumeFromClientY = useCallback((clientY: number) => {
    const track = volTrackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const ratio = 1 - (clientY - rect.top) / rect.height
    setVolume(Math.max(0, Math.min(1, ratio)))
  }, [])

  const onVolPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    applyVolumeFromClientY(e.clientY)

    const onMove = (ev: PointerEvent) => applyVolumeFromClientY(ev.clientY)
    const onUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume
      setVolume(0)
    } else {
      setVolume(prevVolumeRef.current || 0.75)
    }
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !hasTracks) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => {})
    }
  }

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = percent * duration
    setCurrent(audio.currentTime)
  }

  const showTalk = (side: 'left' | 'right') => {
    if (talkTimer.current) clearTimeout(talkTimer.current)
    setTalk({ side, text: pick(side === 'left' ? TALK_LEFT : TALK_RIGHT) })
    talkTimer.current = setTimeout(() => setTalk(null), 2000)
  }

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return
    void (async () => {
      const added: Track[] = []
      for (const file of Array.from(files)) {
        if (!isAudioFile(file)) continue
        try {
          const track = await addMusicTrackFromFile(file, {
            id: uid(),
            title: stripExt(file.name) || file.name,
          })
          added.push(track)
        } catch (e) {
          console.warn('[音乐] 保存曲目失败:', e)
        }
      }
      if (!added.length) return

      setTracks((prev) => {
        const next = [...prev, ...added]
        const startAt = prev.length
        queueMicrotask(() => loadTrack(startAt, true, next))
        return next
      })

      if (fileRef.current) fileRef.current.value = ''
    })()
  }

  const handleDelete = (idx: number) => {
    const list = tracksRef.current
    const target = list[idx]
    if (!target) return

    const wasCurrent = idx === indexRef.current
    const nextList = list.filter((_, i) => i !== idx)

    if (target.url.startsWith('blob:')) {
      URL.revokeObjectURL(target.url)
    }

    setTracks(nextList)
    void removeMusicTrack(target.id).catch((e) => console.warn('[音乐] 删除失败:', e))

    if (!nextList.length) {
      setIndex(0)
      stopAudio()
      return
    }

    if (wasCurrent) {
      const nextIdx = Math.min(idx, nextList.length - 1)
      loadTrack(nextIdx, playing, nextList)
    } else if (idx < indexRef.current) {
      setIndex((i) => i - 1)
    }
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="音乐播放器"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            ref={panelRef}
            className="music-panel relative flex h-[310px] w-full max-w-[360px] flex-col rounded-[20px] border border-white/90 bg-white/15 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.15),inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl"
          >
            <button
              type="button"
              title="关闭"
              onClick={onClose}
              className="absolute right-3 top-2.5 z-20 flex size-6 items-center justify-center opacity-60 transition-opacity hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="size-3.5 fill-[#555]">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>

            {/* avatars */}
            <div className="relative mb-3 flex items-center justify-center px-2">
              <button
                type="button"
                className="relative z-[5] size-[52px] shrink-0 overflow-visible rounded-full border-2 border-white/90 bg-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
                onClick={() => showTalk('left')}
              >
                <img
                  src={userAvatar || DEFAULT_USER_AVATAR}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
                {talk?.side === 'left' ? (
                  <span className="music-talk-bubble music-talk-show">{talk.text}</span>
                ) : null}
              </button>

              <div
                className={[
                  'relative mx-[15px] flex h-10 w-[100px] items-center justify-center',
                  playing ? '' : 'music-pulse-paused',
                ].join(' ')}
              >
                <svg viewBox="0 0 100 40" className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
                  <path
                    d="M0,20 L25,20 L32,5 L40,35 L48,-5 L55,20 L100,20"
                    className="music-beat-line"
                    fill="none"
                  />
                </svg>
                <svg viewBox="0 0 24 24" className="music-white-heart relative z-[2] size-[18px]">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              <button
                type="button"
                className="relative z-[5] size-[52px] shrink-0 overflow-visible rounded-full border-2 border-white/90 bg-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
                onClick={() => showTalk('right')}
              >
                <img
                  src={peerAvatar || boyfriendBg}
                  alt=""
                  className="size-full rounded-full object-cover"
                />
                {talk?.side === 'right' ? (
                  <span className="music-talk-bubble music-talk-show">{talk.text}</span>
                ) : null}
              </button>
            </div>

            {/* lyric bubble */}
            <div className="music-lyric-bubble relative mx-auto mb-2.5 max-w-[85%] rounded-[14px] bg-white/85 px-3.5 py-2 text-center text-[13px] font-medium text-[#4a4a4a] shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              {bubble}
            </div>

            {/* track list */}
            <div ref={listRef} className="music-tracklist mb-2 flex-1 overflow-y-auto pr-1">
              {hasTracks ? (
                <>
                  {tracks.map((t, i) => (
                    <div
                      key={t.id}
                      data-track-idx={i}
                      className={[
                        'group mb-1 flex w-full items-center rounded-lg px-2.5 py-2 text-xs transition-all',
                        i === index
                          ? 'bg-white/70 font-bold text-black shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                          : 'bg-white/15 text-[#555] hover:bg-white/40',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => loadTrack(i, true)}
                        className="flex min-w-0 flex-1 items-center text-left"
                      >
                        <span className="mr-1.5 w-5 shrink-0 text-center text-[10px] opacity-60">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </button>
                      <button
                        type="button"
                        title="删除"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(i)
                        }}
                        className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-md text-[#888] opacity-70 transition hover:bg-black/10 hover:text-[#e11] hover:opacity-100"
                      >
                        <HiOutlineTrash className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    title="上传音乐"
                    onClick={() => fileRef.current?.click()}
                    className="mb-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/45 bg-white/10 px-2.5 py-2 text-xs text-[#666] transition hover:border-white/70 hover:bg-white/25 hover:text-[#333]"
                  >
                    <HiOutlinePlus className="size-3.5" />
                    <span>添加音乐</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/50 bg-white/15 px-3 text-[#555] transition hover:bg-white/30 hover:text-[#333]"
                >
                  <HiOutlinePlus className="size-5" />
                  <span className="text-xs">上传本地音乐</span>
                </button>
              )}
            </div>

            {/* progress */}
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="w-8 text-center text-[10px] text-[#666] opacity-80">
                {fmtTime(current)}
              </span>
              <div
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration) || 0}
                aria-valuenow={Math.floor(current)}
                tabIndex={0}
                className="relative mx-2 flex h-4 flex-1 cursor-pointer items-center"
                onClick={seek}
              >
                <div className="relative h-1 w-full overflow-hidden rounded-sm bg-white/40">
                  <div
                    className="h-full rounded-sm bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="w-8 text-center text-[10px] text-[#666] opacity-80">
                {fmtTime(duration)}
              </span>
            </div>

            {/* controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                title="播放模式"
                className="music-ctrl-btn"
                onClick={() => setMode((m) => ((m + 1) % 3) as PlayMode)}
              >
                <svg viewBox="0 0 24 24">
                  <path d={MODE_PATHS[mode]} />
                </svg>
              </button>
              <button
                type="button"
                title="上一首"
                className="music-ctrl-btn"
                onClick={() => changeTrack(-1)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                type="button"
                title={playing ? '暂停' : '播放'}
                className="music-ctrl-btn music-ctrl-play"
                onClick={togglePlay}
              >
                <svg viewBox="0 0 24 24">
                  <path d={playing ? PAUSE_PATH : PLAY_PATH} />
                </svg>
              </button>
              <button
                type="button"
                title="下一首"
                className="music-ctrl-btn"
                onClick={() => changeTrack(1)}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* volume */}
              <div ref={volWrapRef} className="relative">
                {volOpen ? (
                  <div className="music-vol-pop absolute bottom-[calc(100%+8px)] left-1/2 z-30 -translate-x-1/2">
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#e8e8e8] bg-white px-2.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                      <span className="select-none text-[10px] font-medium tabular-nums text-[#555]">
                        {Math.round(volume * 100)}
                      </span>
                      <div
                        ref={volTrackRef}
                        role="slider"
                        aria-label="音量"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(volume * 100)}
                        tabIndex={0}
                        className="relative h-[92px] w-7 cursor-ns-resize touch-none"
                        onPointerDown={onVolPointerDown}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                            e.preventDefault()
                            setVolume((v) => Math.min(1, v + 0.05))
                          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                            e.preventDefault()
                            setVolume((v) => Math.max(0, v - 0.05))
                          } else if (e.key === 'Home') {
                            setVolume(0)
                          } else if (e.key === 'End') {
                            setVolume(1)
                          }
                        }}
                      >
                        <div className="pointer-events-none absolute inset-x-[11px] inset-y-0 rounded-full bg-[#e5e5e5]" />
                        <div
                          className="pointer-events-none absolute inset-x-[11px] bottom-0 rounded-full bg-[#555]"
                          style={{ height: `${volume * 100}%` }}
                        />
                        <div
                          className="pointer-events-none absolute left-1/2 size-3.5 -translate-x-1/2 rounded-full border border-[#ddd] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                          style={{ bottom: `calc(${volume * 100}% - 7px)` }}
                        />
                      </div>
                      <button
                        type="button"
                        title={volume === 0 ? '取消静音' : '静音'}
                        className="flex size-6 items-center justify-center rounded-full text-[#666] transition hover:bg-[#f0f0f0]"
                        onClick={toggleMute}
                      >
                        {volume === 0 ? (
                          <HiOutlineSpeakerXMark className="size-3.5" />
                        ) : (
                          <HiOutlineSpeakerWave className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  title="音量"
                  aria-expanded={volOpen}
                  className={[
                    'music-ctrl-btn',
                    volOpen ? 'bg-white/40' : '',
                  ].join(' ')}
                  onClick={() => setVolOpen((v) => !v)}
                >
                  {volume === 0 ? (
                    <HiOutlineSpeakerXMark className="size-5 text-[#666]" />
                  ) : (
                    <HiOutlineSpeakerWave className="size-5 text-[#666]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
