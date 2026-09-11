import type { UiMessage } from '../types'
import type { ReplyMode } from '../utils/characterStorage'
import { DEFAULT_USER_AVATAR } from '../utils/characterStorage'
import { renderNarrationWithDialogueHighlight } from '../utils/narrationHighlight'

interface ChatBubbleProps {
  message: UiMessage
  peerAvatar: string
  peerName: string
  userName?: string
  userAvatar?: string
  replyMode?: ReplyMode
  onUserAvatarClick?: () => void
  onPeerAvatarClick?: () => void
}

export function ChatBubble({
  message,
  peerAvatar,
  peerName,
  userName = '我',
  userAvatar = DEFAULT_USER_AVATAR,
  replyMode = 'im_bubble',
  onUserAvatarClick,
  onPeerAvatarClick,
}: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const narrativeLeft = !isUser && replyMode === 'immersive_novel'
  const avatarSrc = isUser ? userAvatar : peerAvatar

  if (narrativeLeft) {
    return (
      <div className="bubble-enter flex w-full flex-col gap-1.5 pr-6 sm:pr-16">
        <div
          className={[
            'max-w-full text-[15px] leading-[1.75]',
            message.error ? 'text-red-300/90' : '',
          ].join(' ')}
        >
          {message.pending && !message.content ? (
            <span className="inline-flex items-center gap-1.5 py-1">
              <span className="typing-dot size-1.5 rounded-full bg-white/55" />
              <span className="typing-dot size-1.5 rounded-full bg-white/55" />
              <span className="typing-dot size-1.5 rounded-full bg-white/55" />
            </span>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {message.error
                ? message.content
                : renderNarrationWithDialogueHighlight(message.content)}
            </p>
          )}
        </div>
      </div>
    )
  }

  const avatarButton = (opts: {
    title: string
    onClick?: () => void
  }) =>
    opts.onClick ? (
      <button
        type="button"
        title={opts.title}
        onClick={opts.onClick}
        className="mt-1 size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 transition hover:ring-2 hover:ring-[var(--accent-a)]/70"
      >
        <img src={avatarSrc} alt="" className="size-full object-cover" />
      </button>
    ) : (
      <img
        src={avatarSrc}
        alt=""
        className="mt-1 size-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    )

  return (
    <div
      className={`bubble-enter flex w-full gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {isUser
        ? avatarButton({ title: '编辑我的资料', onClick: onUserAvatarClick })
        : avatarButton({ title: '编辑角色资料', onClick: onPeerAvatarClick })}
      <div className={`flex max-w-[78%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="px-1 text-[11px] text-white/40">{isUser ? userName : peerName}</span>
        <div
          className={[
            'rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-glass backdrop-blur-md',
            isUser
              ? 'rounded-tr-md bg-[linear-gradient(135deg,rgba(124,92,255,0.85),rgba(91,140,255,0.75))] text-white'
              : 'rounded-tl-md border border-white/10 bg-white/[0.08] text-mist-100',
            message.error ? 'border border-red-400/40 bg-red-500/20' : '',
          ].join(' ')}
        >
          {message.pending && !message.content ? (
            <span className="inline-flex items-center gap-1.5 px-1 py-0.5">
              <span className="typing-dot size-1.5 rounded-full bg-white/80" />
              <span className="typing-dot size-1.5 rounded-full bg-white/80" />
              <span className="typing-dot size-1.5 rounded-full bg-white/80" />
            </span>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}
