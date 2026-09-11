import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import boyfriendBg from '../assets/boyfriend.jpg'
import { getProvider } from '../config/modelProviders'
import type { AppConfig } from '../utils/configStorage'
import { ConfigStorage, hasApiKey } from '../utils/configStorage'
import { AiCaller, type ChatMessage } from '../utils/aiCaller'
import {
  bgAdjustStyle,
  loadBgSettings,
  saveBgSettings,
  type BgSettings,
} from '../utils/bgSettings'
import {
  buildCharacterSystemPrompt,
  buildUserContentForApi,
  DEFAULT_CHARACTER_AVATAR,
  loadCharacter,
  saveCharacter,
  withReplyMode,
  type CharacterCard,
  type ReplyMode,
} from '../utils/characterStorage'
import {
  buildMemoryFactsBlock,
  loadMemory,
  retrieveFacts,
  type MemorySettings,
} from '../utils/memoryStorage'
import { loadFactsForRetrieval, runSecondaryMemoryUpdate } from '../utils/memoryOps'
import { migrateLegacyFactsIfNeeded } from '../utils/memoryDb'
import { deleteKulanChatDatabase } from '../utils/idb'
import { loadMessages, saveMessages } from '../utils/messageStore'
import type { UiMessage } from '../types'
import { ApiPanel } from './ApiPanel'
import { BackgroundPicker } from './BackgroundPicker'
import { CharacterProfileModal } from './CharacterProfileModal'
import { CharacterSettingsPage } from './CharacterSettingsPage'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { ConfirmClearIdbModal } from './ConfirmClearIdbModal'
import { MemorySettingsPage } from './MemorySettingsPage'
import { MessageList } from './MessageList'
import { ModelSwitchModal } from './ModelSwitchModal'
import { MusicPlayerModal } from './MusicPlayerModal'
import { ModePanel } from './ModePanel'
import { SettingsMenu, type SettingsPageId } from './SettingsMenu'
import { UserProfileModal } from './UserProfileModal'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ChatPage() {
  const [config, setConfig] = useState<AppConfig>(() => ConfigStorage.getConfig())
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [messagesReady, setMessagesReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [memoryBusy, setMemoryBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [bgOpen, setBgOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const [settingsPage, setSettingsPage] = useState<SettingsPageId | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [peerProfileOpen, setPeerProfileOpen] = useState(false)
  const [clearIdbBusy, setClearIdbBusy] = useState(false)
  const [clearIdbOpen, setClearIdbOpen] = useState(false)
  const [bgSettings, setBgSettings] = useState<BgSettings>(() => loadBgSettings())
  const [character, setCharacter] = useState<CharacterCard>(() => loadCharacter())
  const [, setMemory] = useState<MemorySettings>(() => loadMemory())

  const modeBtnRef = useRef<HTMLButtonElement>(null)
  const themeBtnRef = useRef<HTMLButtonElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const messagesRef = useRef<UiMessage[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await migrateLegacyFactsIfNeeded()
        const stored = await loadMessages()
        if (!cancelled) {
          setMessages(stored)
          setMessagesReady(true)
        }
      } catch (e) {
        console.warn('[消息] 加载失败:', e)
        if (!cancelled) setMessagesReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!messagesReady) return
    const durable = messages.filter((m) => !m.pending)
    void saveMessages(durable).catch((e) => console.warn('[消息] 保存失败:', e))
  }, [messages, messagesReady])

  const handleSaved = useCallback((next: AppConfig) => {
    setConfig(next)
  }, [])

  const handleBgChange = useCallback((next: BgSettings) => {
    setBgSettings(next)
    saveBgSettings(next)
  }, [])

  const closeOverlays = () => {
    setBgOpen(false)
    setMusicOpen(false)
    setSettingsOpen(false)
    setModeOpen(false)
  }

  const handleReplyModeChange = useCallback((mode: ReplyMode) => {
    setCharacter((prev) => {
      const next = withReplyMode(prev, mode)
      saveCharacter(next)
      return next
    })
  }, [])

  const handleFreshModeChange = useCallback((enabled: boolean) => {
    setCharacter((prev) => {
      const next = { ...prev, freshMode: enabled }
      saveCharacter(next)
      return next
    })
  }, [])

  const handleClearIdb = useCallback(async () => {
    setClearIdbBusy(true)
    closeOverlays()
    try {
      await deleteKulanChatDatabase()
      window.location.reload()
    } catch (e) {
      console.warn('[IndexedDB] 清除失败:', e)
      setClearIdbBusy(false)
      window.alert('清除失败，请打开控制台查看详情后重试。')
    }
  }, [])

  const bgUrl = useMemo(() => {
    if (bgSettings.source === 'custom' && bgSettings.customUrl) {
      return bgSettings.customUrl
    }
    return boyfriendBg
  }, [bgSettings])

  const adjust = useMemo(() => bgAdjustStyle(bgSettings.adjust), [bgSettings.adjust])

  const peerName = character.name || '对方'
  const peerAvatar = character.avatar || DEFAULT_CHARACTER_AVATAR
  const userName = character.userName || '我'
  const userAvatar = character.userAvatar

  const runMemoryUpdate = async (
    historyForMemory: Array<{ role: string; content: string }>,
    assistantReply: string,
  ) => {
    setMemoryBusy(true)
    try {
      const card = loadCharacter()
      const result = await runSecondaryMemoryUpdate({
        character: card,
        conversationTail: historyForMemory.slice(-12),
        assistantReply,
      })
      console.log('[副模型记忆]', result.message)
      setMemory(loadMemory())
    } finally {
      setMemoryBusy(false)
    }
  }

  const handleSend = async (text: string) => {
    if (sending) return

    if (!hasApiKey()) {
      setModalOpen(true)
      return
    }

    const userMsg: UiMessage = { id: uid(), role: 'user', content: text }
    const pendingId = uid()
    const pendingMsg: UiMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      pending: true,
    }

    setMessages((prev) => [...prev, userMsg, pendingMsg])
    setSending(true)

    const mem = loadMemory()
    const card = loadCharacter()
    const contextCount = mem.contextMessageCount || 30
    const historyMsgs = [...messagesRef.current, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content)
    const sliced = historyMsgs.slice(-contextCount)

    let factsBlock = ''
    try {
      const idbFacts = await loadFactsForRetrieval()
      const relevant = retrieveFacts(idbFacts, text, 8)
      factsBlock = buildMemoryFactsBlock(relevant)
    } catch (e) {
      console.warn('[记忆检索] 失败，继续聊天:', e)
    }

    let systemContent = buildCharacterSystemPrompt(card)
    if (factsBlock) systemContent += `\n\n${factsBlock}`

    const history: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...sliced.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          m.id === userMsg.id ? buildUserContentForApi(text, card) : m.content,
      })),
    ]

    const cfg = ConfigStorage.getApiConfig()
    const provider = getProvider(cfg.providerId)
    const caller = new AiCaller({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature,
      topP: cfg.topP,
      maxTokens: 800,
      disableThinking: Boolean(provider.supportsThinkingDisable),
    })

    let streamed = ''

    try {
      await caller.chatStream(
        history,
        (chunk) => {
          streamed += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? { ...m, content: streamed, pending: true }
                : m,
            ),
          )
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...m, content: streamed, pending: false } : m,
            ),
          )
          setSending(false)

          if (streamed.trim()) {
            void runMemoryUpdate(sliced, streamed)
          }
        },
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? {
                    ...m,
                    pending: false,
                    error: true,
                    content: streamed || `出错了：${err.message}`,
                  }
                : m,
            ),
          )
          setSending(false)
        },
      )
    } catch {
      setSending(false)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 scale-105 bg-cover bg-[center_20%] transition-[filter] duration-300"
          style={{
            backgroundImage: `url(${bgUrl})`,
            filter: `blur(${adjust.blur}) brightness(${adjust.brightness})`,
          }}
        />
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{ backgroundColor: adjust.overlay }}
        />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      <ChatHeader
        freshMode={character.freshMode}
        modeOpen={modeOpen}
        modeButtonRef={modeBtnRef}
        onModeClick={() => {
          setBgOpen(false)
          setMusicOpen(false)
          setSettingsOpen(false)
          setModeOpen((v) => !v)
        }}
        themeOpen={bgOpen}
        themeButtonRef={themeBtnRef}
        onThemeClick={() => {
          setMusicOpen(false)
          setSettingsOpen(false)
          setModeOpen(false)
          setBgOpen((v) => !v)
        }}
        musicOpen={musicOpen}
        onMusicClick={() => {
          setBgOpen(false)
          setSettingsOpen(false)
          setModeOpen(false)
          setMusicOpen((v) => !v)
        }}
        settingsOpen={settingsOpen}
        settingsButtonRef={settingsBtnRef}
        onSettingsClick={() => {
          setBgOpen(false)
          setMusicOpen(false)
          setModeOpen(false)
          setSettingsOpen((v) => !v)
        }}
        clearIdbBusy={clearIdbBusy}
        onClearIdbClick={() => {
          closeOverlays()
          setClearIdbOpen(true)
        }}
      />

      <ConfirmClearIdbModal
        open={clearIdbOpen}
        busy={clearIdbBusy}
        onClose={() => {
          if (!clearIdbBusy) setClearIdbOpen(false)
        }}
        onConfirm={() => void handleClearIdb()}
      />

      <ModePanel
        open={modeOpen}
        anchorRef={modeBtnRef}
        character={character}
        onClose={() => setModeOpen(false)}
        onReplyModeChange={handleReplyModeChange}
        onFreshModeChange={handleFreshModeChange}
        onOpenOutputSettings={() => setSettingsPage('character')}
      />

      <BackgroundPicker
        open={bgOpen}
        anchorRef={themeBtnRef}
        settings={bgSettings}
        defaultPreviewUrl={boyfriendBg}
        onChange={handleBgChange}
        onClose={() => setBgOpen(false)}
      />

      <MusicPlayerModal
        open={musicOpen}
        onClose={() => setMusicOpen(false)}
        userAvatar={userAvatar}
        peerAvatar={peerAvatar}
      />

      <SettingsMenu
        open={settingsOpen}
        anchorRef={settingsBtnRef}
        onClose={() => setSettingsOpen(false)}
        onSelect={(page) => {
          closeOverlays()
          setSettingsPage(page)
        }}
      />

      <CharacterSettingsPage
        open={settingsPage === 'character'}
        onBack={() => setSettingsPage(null)}
        onSaved={setCharacter}
      />

      <MemorySettingsPage
        open={settingsPage === 'memory'}
        onBack={() => setSettingsPage(null)}
        onSaved={setMemory}
      />

      <MessageList
        messages={messages}
        peerAvatar={peerAvatar}
        peerName={peerName}
        userName={userName}
        userAvatar={userAvatar}
        replyMode={character.replyMode}
        onUserAvatarClick={() => {
          closeOverlays()
          setPeerProfileOpen(false)
          setProfileOpen(true)
        }}
        onPeerAvatarClick={() => {
          closeOverlays()
          setProfileOpen(false)
          setPeerProfileOpen(true)
        }}
      />

      <UserProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={setCharacter}
      />

      <CharacterProfileModal
        open={peerProfileOpen}
        onClose={() => setPeerProfileOpen(false)}
        onSaved={setCharacter}
      />

      <div className="relative z-20 mx-auto w-full max-w-[800px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {memoryBusy && (
          <p className="mb-1.5 px-1 text-[11px] text-white/35">正在整理长期记忆…</p>
        )}
        <div className="rounded-[28px] border border-white/10 bg-black/30 px-3 pb-3 pt-2.5 shadow-glass backdrop-blur-2xl">
          <ApiPanel
            model={config.model}
            providerId={config.providerId}
            onSwitchModel={() => setModalOpen(true)}
          />
          <ChatInput disabled={sending || !messagesReady} onSend={handleSend} />
        </div>
      </div>

      <ModelSwitchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
