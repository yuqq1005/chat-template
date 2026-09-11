import { useEffect, useState } from 'react'
import { HiOutlineExclamationTriangle, HiOutlineXMark } from 'react-icons/hi2'

interface ConfirmClearIdbModalProps {
  open: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmClearIdbModal({
  open,
  busy,
  onClose,
  onConfirm,
}: ConfirmClearIdbModalProps) {
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    if (!open) return
    setStep(1)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => {
        if (!busy) onClose()
      }}
      role="presentation"
    >
      <div
        className="modal-panel flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/15 bg-[rgba(14,16,24,0.96)] shadow-glass backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-idb-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <HiOutlineExclamationTriangle className="size-5" />
            </span>
            <div>
              <h2 id="clear-idb-title" className="font-display text-lg font-semibold text-white">
                {step === 1 ? '清除本地数据' : '再次确认'}
              </h2>
              <p className="mt-0.5 text-xs text-white/45">
                {step === 1 ? '第一步 · 请阅读影响范围' : '第二步 · 确认后不可恢复'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="关闭"
          >
            <HiOutlineXMark className="size-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-white/70">
          {step === 1 ? (
            <>
              <p>将删除聊天库 <code className="text-white/55">KulanChatDB</code> 中的：</p>
              <ul className="list-inside list-disc space-y-1 text-white/55">
                <li>聊天消息</li>
                <li>长期事实（memoryFacts）</li>
                <li>记忆事件（episodes）</li>
              </ul>
              <p className="text-white/45">
                角色卡、API、音量等 LocalStorage，以及音乐歌单库{' '}
                <code className="text-white/55">KulanMusicDB</code> 会保留。清除后页面会刷新。
              </p>
            </>
          ) : (
            <p>
              确定要清空聊天 IndexedDB 吗？音乐歌单不会被删除。此操作无法撤销，仅用于测试重置。
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-40"
          >
            取消
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(2)}
              className="flex-1 rounded-full border border-red-400/35 bg-red-500/15 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/25"
            >
              继续
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {busy ? '清除中…' : '确认清除'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
