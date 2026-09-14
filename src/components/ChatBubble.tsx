import type { UiMessage } from '../types'
import type { ReplyMode, SceneHeaderSettings } from '../utils/characterStorage'
import { DEFAULT_SCENE_HEADER, DEFAULT_USER_AVATAR } from '../utils/characterStorage'
import type { GameplaySettings } from '../utils/gameplayStorage'
import { DEFAULT_GAMEPLAY } from '../utils/gameplayStorage'
import { renderNarrationWithDialogueHighlight } from '../utils/narrationHighlight'
import { sanitizeModelOutputForDisplay } from '../utils/sanitizeModelOutput'
import { GameplayTabs } from './GameplayTabs'
import { SceneMetaHeader } from './SceneMetaHeader'

interface ChatBubbleProps {
  message: UiMessage
  peerAvatar: string
  peerName: string
  userName?: string
  userAvatar?: string
  replyMode?: ReplyMode
  sceneHeader?: SceneHeaderSettings
  gameplaySettings?: GameplaySettings
  /** 用户消息所属轮次（第 N 轮）；仅 user 展示 */
  turnIndex?: number
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
  sceneHeader = DEFAULT_SCENE_HEADER,
  gameplaySettings = DEFAULT_GAMEPLAY,
  turnIndex,
  onUserAvatarClick,
  onPeerAvatarClick,
}: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const narrativeLeft = !isUser && replyMode === 'immersive_novel'
  const avatarSrc = isUser ? userAvatar : peerAvatar
  const displayContent = isUser
    ? message.content
    : sanitizeModelOutputForDisplay(message.content)

  const sceneBlock =
    !isUser && message.scene ? (
      <SceneMetaHeader scene={message.scene} settings={sceneHeader} />
    ) : null

  const gameplayBlock =
    !isUser && !message.pending && (message.gameplay || message.gameplayLoading) ? (
      <GameplayTabs
        gameplay={message.gameplay}
        settings={gameplaySettings}
        loading={message.gameplayLoading}
      />
    ) : null

  const avatarButton = (opts: {
    title: string
    onClick?: () => void
  }) =>
    opts.onClick ? (
      <button
        type="button"
        title={opts.title}
        onClick={opts.onClick}
        className="size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 transition hover:ring-2 hover:ring-[var(--accent-a)]/70"
      >
        <img src={avatarSrc} alt="" className="size-full object-cover" />
      </button>
    ) : (
      <img
        src={avatarSrc}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    )

  const avatarColumn = (
    <div className="mt-1 flex shrink-0 flex-col items-center gap-0.5">
      {isUser && turnIndex != null && turnIndex > 0 ? (
        <span className="whitespace-nowrap text-[10px] tabular-nums tracking-wide text-white/35">
          第 {turnIndex} 轮
        </span>
      ) : null}
      {isUser
        ? avatarButton({ title: '编辑我的资料', onClick: onUserAvatarClick })
        : avatarButton({ title: '编辑角色资料', onClick: onPeerAvatarClick })}
    </div>
  )

  /** 旁白+玩法：左侧头像/名字 + 无气泡叙事墙 */
  if (narrativeLeft) {
    return (
      <div className="bubble-enter flex w-full gap-2.5 pr-2 sm:pr-10">
        {avatarColumn}
        <div className="flex min-w-0 flex-1 flex-col gap-1 items-start">
          <span className="px-1 text-[11px] text-white/40">{peerName}</span>
          {sceneBlock}
          <div
            className={[
              'w-full text-[15px] leading-[1.75]',
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
                  ? displayContent
                  : renderNarrationWithDialogueHighlight(displayContent)}
              </p>
            )}
          </div>
          {gameplayBlock}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bubble-enter flex w-full gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {avatarColumn}
      <div className={`flex max-w-[78%] flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="px-1 text-[11px] text-white/40">{isUser ? userName : peerName}</span>
        {!isUser ? <div className="w-full">{sceneBlock}</div> : null}
        <div
          className={[
            'rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-glass',
            isUser
              ? 'rounded-tr-md border border-white/55 bg-white/12 text-white backdrop-blur-xl'
              : 'rounded-tl-md border border-white/10 bg-white/[0.08] text-mist-100 backdrop-blur-md',
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
            <p className="whitespace-pre-wrap break-words">{displayContent}</p>
          )}
        </div>
        {!isUser ? gameplayBlock : null}
      </div>
    </div>
  )
}
