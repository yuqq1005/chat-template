import type { MessageGameplay } from './utils/gameplayMeta'

export type MessageRole = 'user' | 'assistant' | 'system'

/** 助手消息场景页眉（可选，不影响 content 正文） */
export interface MessageScene {
  /** ISO 时间，由客户端随机/推进 */
  time: string
  location?: string
  /** 现场人物，可选 */
  people?: string
  weather?: string
  /** 上帝视角评价，约 10–30 字 */
  godComment?: string
}

export interface UiMessage {
  id: string
  role: MessageRole
  content: string
  pending?: boolean
  error?: boolean
  /** 开场白：正文前展示杂志风角色介绍 */
  intro?: boolean
  /** 仅 assistant；展示在正文前 */
  scene?: MessageScene
  /** 仅 assistant；剧情后二次生成的玩法面板 */
  gameplay?: MessageGameplay
  /** 玩法二次调用进行中（不落库） */
  gameplayLoading?: boolean
}
