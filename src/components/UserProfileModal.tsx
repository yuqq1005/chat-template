import { useEffect, useRef, useState } from 'react'
import { HiOutlineCamera, HiOutlineXMark } from 'react-icons/hi2'
import {
  DEFAULT_USER_AVATAR,
  fileToAvatarDataUrl,
  loadCharacter,
  saveCharacter,
  type CharacterCard,
} from '../utils/characterStorage'

interface UserProfileModalProps {
  open: boolean
  onClose: () => void
  onSaved: (card: CharacterCard) => void
}

export function UserProfileModal({ open, onClose, onSaved }: UserProfileModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('我')
  const [avatar, setAvatar] = useState(DEFAULT_USER_AVATAR)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const card = loadCharacter()
    setName(card.userName || '我')
    setAvatar(card.userAvatar || DEFAULT_USER_AVATAR)
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await fileToAvatarDataUrl(file)
      setAvatar(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = () => {
    const card = loadCharacter()
    const next: CharacterCard = {
      ...card,
      userName: name.trim() || '我',
      userAvatar: avatar || DEFAULT_USER_AVATAR,
    }
    saveCharacter(next)
    onSaved(next)
    onClose()
  }

  const handleResetAvatar = () => {
    setAvatar(DEFAULT_USER_AVATAR)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-panel flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/15 bg-[rgba(14,16,24,0.94)] shadow-glass backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="user-profile-title" className="font-display text-lg font-semibold text-white">
              编辑我的资料
            </h2>
            <p className="mt-0.5 text-xs text-white/45">修改头像与名字，仅保存在本地</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            <HiOutlineXMark className="size-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 px-5 py-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />

          <button
            type="button"
            title="更换头像"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="group relative size-24 overflow-hidden rounded-full ring-2 ring-white/15 transition hover:ring-[var(--accent-a)]/60 disabled:opacity-60"
          >
            <img src={avatar} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
              <HiOutlineCamera className="size-6 text-white" />
            </span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10"
            >
              {busy ? '处理中…' : '上传头像'}
            </button>
            <button
              type="button"
              onClick={handleResetAvatar}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45 transition hover:bg-white/5 hover:text-white/70"
            >
              恢复默认
            </button>
          </div>

          {error ? <p className="text-xs text-red-300">{error}</p> : null}

          <label className="w-full">
            <span className="mb-1.5 block text-xs text-white/50">你的名字</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我"
              maxLength={32}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent-a)]/50"
            />
          </label>
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
