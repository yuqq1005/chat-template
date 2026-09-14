import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import boyfriendBg from '../assets/boyfriend.jpg'
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
  buildCharacterSystemMessages,
  buildUserContentForApi,
  DEFAULT_CHARACTER_AVATAR,
  loadCharacter,
  normalizeSceneHeader,
  saveCharacter,
  withReplyMode,
  type CharacterCard,
  type ReplyMode,
} from '../utils/characterStorage'
import {
  loadMemory,
  type MemorySettings,
} from '../utils/memoryStorage'
import { loadFactsForRetrieval, runSecondaryMemoryUpdate } from '../utils/memoryOps'
import {
  buildMemoryRetrievalQuery,
  buildRelevantMemoryFactsBlock,
  retrieveRelevantMemoryFacts,
} from '../utils/memoryRetrieval'
import {
  ASSISTANT_CONTINUE_PROMPT,
  shouldContinueAssistant,
} from '../utils/assistantCompleteness'
import { migrateLegacyFactsIfNeeded } from '../utils/memoryDb'
import { deleteKulanChatDatabase } from '../utils/idb'
import { loadMessages, saveMessages } from '../utils/messageStore'
import {
  buildMessageScene,
  createGreetingScene,
  fetchSceneMeta,
  nextStoryTimeFromMessages,
} from '../utils/sceneMeta'
import { fetchGameplay } from '../utils/gameplayMeta'
import {
  GAMEPLAY_PANEL_ORDER,
  hasAnyGameplayEnabled,
  loadGameplay,
  saveGameplay,
  type GameplaySettings,
} from '../utils/gameplayStorage'
import type { UiMessage } from '../types'
import { ApiPanel } from './ApiPanel'
import { BackgroundPicker } from './BackgroundPicker'
import { CharacterProfileModal } from './CharacterProfileModal'
import { CharacterSettingsPage } from './CharacterSettingsPage'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { ConfirmClearIdbModal } from './ConfirmClearIdbModal'
import { GameplaySettingsPage } from './GameplaySettingsPage'
import { ExportSettingsPage } from './ExportSettingsPage'
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
  const [gameplaySettings, setGameplaySettings] = useState<GameplaySettings>(() => loadGameplay())

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

  /** 空会话注入开场白预设（不调模型） */
  useEffect(() => {
    if (!messagesReady) return
    if (messages.length > 0) return
    const greeting = character.greeting?.trim()
    if (!greeting) return
    const scene = character.sceneHeader?.enabled
      ? createGreetingScene(character.name)
      : undefined
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        content: greeting,
        ...(scene ? { scene } : {}),
      },
    ])
  }, [messagesReady, messages.length, character.greeting, character.name, character.sceneHeader?.enabled])

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

  const handleMemoryEngineChange = useCallback((enabled: boolean) => {
    setCharacter((prev) => {
      const next = { ...prev, memoryEngineEnabled: enabled }
      saveCharacter(next)
      return next
    })
  }, [])

  const handleSceneHeaderChange = useCallback((enabled: boolean) => {
    setCharacter((prev) => {
      const next = {
        ...prev,
        sceneHeader: {
          ...normalizeSceneHeader(prev.sceneHeader),
          enabled,
        },
      }
      saveCharacter(next)
      return next
    })
  }, [])

  const handleGameplayEnabledChange = useCallback((enabled: boolean) => {
    setGameplaySettings((prev) => {
      const next = { ...prev }
      for (const id of GAMEPLAY_PANEL_ORDER) {
        next[id] = { ...next[id], enabled }
      }
      saveGameplay(next)
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
    const card = loadCharacter()
    if (!card.memoryEngineEnabled) {
      console.log('[副模型记忆]', '已关闭后台记忆整理，跳过')
      return
    }
    setMemoryBusy(true)
    try {
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
    const card = loadCharacter()
    const sceneHeader = normalizeSceneHeader(card.sceneHeader)
    const storyTime = nextStoryTimeFromMessages(messagesRef.current)
    const prevScene = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === 'assistant' && m.scene)?.scene

    // 页眉 + 剧情都完成前：只显示打字中，不提前渲染页眉/正文
    const pendingMsg: UiMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      pending: true,
    }

    setMessages((prev) => [...prev, userMsg, pendingMsg])
    setSending(true)

    const mem = loadMemory()
    const contextCount = mem.contextMessageCount || 30
    const historyMsgs = [...messagesRef.current, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content)
    const sliced = historyMsgs.slice(-contextCount)

    let factsBlock = ''
    try {
      const idbFacts = await loadFactsForRetrieval()
      const queryText = buildMemoryRetrievalQuery(text, historyMsgs)
      const relevant = retrieveRelevantMemoryFacts(idbFacts, queryText, {
        limit: 10,
        minScore: 7,
        lastUserMessage: text,
      })
      factsBlock = buildRelevantMemoryFactsBlock(relevant)
      if (relevant.length) {
        console.log('[记忆检索] 注入主模型 facts 数量:', relevant.length)
      }
    } catch (e) {
      console.warn('[记忆检索] 失败，继续聊天:', e)
    }

    const cfg = ConfigStorage.getApiConfig()
    const history: ChatMessage[] = [
      ...buildCharacterSystemMessages(card, {
        outputCharsMin: cfg.outputCharsMin,
        outputCharsMax: cfg.outputCharsMax,
      }),
      ...(factsBlock ? [{ role: 'system' as const, content: factsBlock }] : []),
      ...sliced.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          m.id === userMsg.id ? buildUserContentForApi(text, card) : m.content,
      })),
    ]

    const allowContinue = !card.freshMode
    const caller = new AiCaller({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      model: cfg.model,
      temperature: cfg.temperature,
      topP: cfg.topP,
      maxTokens: cfg.maxTokens,
      // 主剧情强制关思考（不依赖 provider 标记；自定义网关也关掉）
      disableThinking: true,
    })

    let streamed = ''

    const commitAssistant = (
      content: string,
      opts: {
        pending?: boolean
        error?: boolean
        scene?: UiMessage['scene']
        gameplay?: UiMessage['gameplay']
        gameplayLoading?: boolean
      } = {},
    ) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                content,
                pending: opts.pending ?? false,
                error: opts.error || undefined,
                scene: opts.scene,
                gameplay: opts.gameplay,
                gameplayLoading: opts.gameplayLoading || undefined,
              }
            : m,
        ),
      )
    }

    const runGameplayAfterNarrative = async (body: string, scene: UiMessage['scene']) => {
      if (card.freshMode) return
      const gp = loadGameplay()
      if (!body.trim() || !hasAnyGameplayEnabled(gp)) return
      commitAssistant(body, { pending: false, scene, gameplayLoading: true })
      try {
        const data = await fetchGameplay({
          character: card,
          settings: gp,
          userText: text,
          narrative: body,
        })
        commitAssistant(body, {
          pending: false,
          scene,
          gameplay: data ?? undefined,
          gameplayLoading: false,
        })
      } catch (e) {
        console.warn('[玩法] 失败，仅保留剧情:', e)
        commitAssistant(body, { pending: false, scene, gameplayLoading: false })
      }
    }

    const streamOnce = async (msgs: ChatMessage[]) => {
      let finishReason: string | undefined
      await caller.chatStream(
        msgs,
        (chunk) => {
          streamed += chunk
          // 流式阶段不落 UI，等页眉与剧情都完成后一次性渲染
        },
        (meta) => {
          finishReason = meta?.finishReason
        },
      )
      return finishReason
    }

    const buildContinueMessages = (): ChatMessage[] => [
      ...history,
      { role: 'assistant', content: streamed },
      { role: 'user', content: ASSISTANT_CONTINUE_PROMPT },
    ]

    const runNarrative = async (): Promise<string> => {
      let finishReason = await streamOnce(history)
      // 新鲜模式：不续写，靠 max_tokens 一次写完
      if (!allowContinue) return streamed

      let continueRounds = 0
      const maxContinue = 3
      while (
        continueRounds < maxContinue &&
        shouldContinueAssistant(finishReason, streamed)
      ) {
        continueRounds++
        console.log('[主模型] 续写以补全段落', { finishReason, continueRounds })
        try {
          finishReason = await streamOnce(buildContinueMessages())
        } catch (continueErr) {
          console.warn('[主模型] 续写失败，保留已生成正文:', continueErr)
          break
        }
      }
      return streamed
    }

    const runSceneMeta = async () => {
      if (!sceneHeader.enabled) return {}
      return fetchSceneMeta({
        character: card,
        settings: sceneHeader,
        storyTimeIso: storyTime,
        userText: text,
        prevScene,
      })
    }

    try {
      // 页眉短调用 ∥ 主剧情；两者都结束后再渲染（页眉在正文之上）
      const [narrSettled, metaSettled] = await Promise.allSettled([
        runNarrative(),
        runSceneMeta(),
      ])

      const metaFields =
        metaSettled.status === 'fulfilled' ? metaSettled.value : {}
      const scene = buildMessageScene(storyTime, metaFields, sceneHeader)

      if (narrSettled.status === 'fulfilled') {
        const body = narrSettled.value
        commitAssistant(body, {
          pending: false,
          error: !body.trim(),
          scene,
        })
        setSending(false)
        if (body.trim()) {
          void runMemoryUpdate(sliced, body)
          void runGameplayAfterNarrative(body, scene)
        }
        return
      }

      // 主剧情失败：普通模式可尝试续写；新鲜模式不续写
      const narrErr = narrSettled.reason
      if (
        allowContinue &&
        streamed.trim() &&
        shouldContinueAssistant('content_filter', streamed)
      ) {
        let continueRounds = 0
        const maxContinue = 3
        while (
          continueRounds < maxContinue &&
          shouldContinueAssistant('content_filter', streamed)
        ) {
          continueRounds++
          console.log('[主模型] 审查/中断后续写', { continueRounds })
          try {
            const fr = await streamOnce(buildContinueMessages())
            if (!shouldContinueAssistant(fr, streamed)) break
          } catch (continueErr) {
            console.warn('[主模型] 续写失败，保留已生成正文:', continueErr)
            break
          }
        }
        commitAssistant(streamed, { pending: false, scene })
        setSending(false)
        if (streamed.trim()) {
          void runMemoryUpdate(sliced, streamed)
          void runGameplayAfterNarrative(streamed, scene)
        }
        return
      }

      const msg =
        narrErr instanceof Error ? narrErr.message : '未知错误'
      commitAssistant(streamed || `出错了：${msg}`, {
        pending: false,
        error: true,
        scene,
      })
      setSending(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误'
      commitAssistant(streamed || `出错了：${msg}`, {
        pending: false,
        error: true,
        scene: buildMessageScene(storyTime, {}, sceneHeader),
      })
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
        gameplaySettings={gameplaySettings}
        onClose={() => setModeOpen(false)}
        onReplyModeChange={handleReplyModeChange}
        onFreshModeChange={handleFreshModeChange}
        onMemoryEngineChange={handleMemoryEngineChange}
        onSceneHeaderChange={handleSceneHeaderChange}
        onGameplayEnabledChange={handleGameplayEnabledChange}
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

      <GameplaySettingsPage
        open={settingsPage === 'gameplay'}
        onBack={() => setSettingsPage(null)}
        onSaved={setGameplaySettings}
      />

      <ExportSettingsPage
        open={settingsPage === 'export'}
        onBack={() => setSettingsPage(null)}
      />

      <MessageList
        messages={messages}
        peerAvatar={peerAvatar}
        peerName={peerName}
        userName={userName}
        userAvatar={userAvatar}
        replyMode={character.replyMode}
        sceneHeader={character.sceneHeader}
        gameplaySettings={gameplaySettings}
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
