export type MessageRole = 'user' | 'assistant' | 'system'

export interface UiMessage {
  id: string
  role: MessageRole
  content: string
  pending?: boolean
  error?: boolean
}
