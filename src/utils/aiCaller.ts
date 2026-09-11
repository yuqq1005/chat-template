export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; reasoning_content?: string }
    finish_reason?: string
  }>
}

export interface AiCallerOptions {
  baseUrl: string
  apiKey: string
  model: string
  temperature?: number
  topP?: number
  maxTokens?: number
  disableThinking?: boolean
}

export class AiCaller {
  private baseUrl: string
  private apiKey: string
  private model: string
  private temperature: number
  private topP: number
  private maxTokens: number
  private disableThinking: boolean

  constructor(options: AiCallerOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.apiKey = options.apiKey
    this.model = options.model
    this.temperature = options.temperature ?? 0.9
    this.topP = options.topP ?? 0.95
    this.maxTokens = options.maxTokens ?? 2000
    this.disableThinking = options.disableThinking ?? true
  }

  private buildBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      temperature: this.temperature,
      top_p: this.topP,
      max_tokens: this.maxTokens,
      ...extra,
    }
    if (this.disableThinking) {
      body.thinking = { type: 'disabled' }
    }
    return body
  }

  async chat(requestMessages: ChatMessage[]): Promise<{
    content: string
    usage?: ChatCompletionResponse['usage']
    finishReason?: string
  }> {
    const url = `${this.baseUrl}/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody({ messages: requestMessages })),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error?.message || errorMessage
      } catch {
        /* ignore */
      }
      throw new Error(`AI 调用失败: ${errorMessage}`)
    }

    const data: ChatCompletionResponse = await response.json()
    if (!data.choices?.length) throw new Error('AI 返回空内容')
    const content = data.choices[0].message.content || ''
    const finishReason = data.choices[0].finish_reason
    return { content, usage: data.usage, finishReason }
  }

  async chatStream(
    requestMessages: ChatMessage[],
    onChunk: (text: string) => void,
    onComplete?: (meta?: { finishReason?: string }) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    const url = `${this.baseUrl}/chat/completions`
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(
          this.buildBody({
            messages: requestMessages,
            stream: true,
          }),
        ),
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorMessage
        } catch {
          /* ignore */
        }
        throw new Error(`AI 调用失败: ${errorMessage}`)
      }

      if (!response.body) throw new Error('流式响应体为空')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finishReason: string | undefined

      const consumeLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') return
        if (!trimmed.startsWith('data: ')) return
        try {
          const chunk: StreamChunk = JSON.parse(trimmed.slice(6))
          const choice = chunk.choices?.[0]
          const content = choice?.delta?.content
          if (content) onChunk(content)
          if (choice?.finish_reason) finishReason = choice.finish_reason
        } catch {
          /* ignore malformed chunks */
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: !done })
        if (done) {
          buffer += decoder.decode()
          if (buffer.trim()) {
            for (const line of buffer.split('\n')) consumeLine(line)
            buffer = ''
          }
          try {
            await Promise.resolve(onComplete?.({ finishReason }))
          } catch (completeErr) {
            const err =
              completeErr instanceof Error ? completeErr : new Error(String(completeErr))
            onError?.(err)
          }
          break
        }

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) consumeLine(line)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onError?.(err)
      throw err
    }
  }
}
