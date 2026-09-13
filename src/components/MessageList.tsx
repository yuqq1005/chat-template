import { useEffect, useRef } from 'react'
import type { UiMessage } from '../types'
import type { ReplyMode, SceneHeaderSettings } from '../utils/characterStorage'
import { ChatBubble } from './ChatBubble'

interface MessageListProps {
  messages: UiMessage[]
  peerAvatar: string
  peerName: string
  userName?: string
  userAvatar?: string
  replyMode?: ReplyMode
  sceneHeader?: SceneHeaderSettings
  onUserAvatarClick?: () => void
  onPeerAvatarClick?: () => void
}

export function MessageList({
  messages,
  peerAvatar,
  peerName,
  userName,
  userAvatar,
  replyMode,
  sceneHeader,
  onUserAvatarClick,
  onPeerAvatarClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto px-4 py-5">
      <div
        className={[
          'mx-auto flex w-full max-w-[800px] flex-col',
          replyMode === 'immersive_novel' ? 'gap-6' : 'gap-5',
        ].join(' ')}
      >
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            peerAvatar={peerAvatar}
            peerName={peerName}
            userName={userName}
            userAvatar={userAvatar}
            replyMode={replyMode}
            sceneHeader={sceneHeader}
            onUserAvatarClick={onUserAvatarClick}
            onPeerAvatarClick={onPeerAvatarClick}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
