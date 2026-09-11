/** OpenAI-compatible providers — 模型列表以 /models 接口为准 */

export type ProviderId =
  | 'deepseek'
  | 'openai'
  | 'siliconflow'
  | 'moonshot'
  | 'zhipu'
  | 'custom'

export interface ModelOption {
  id: string
  label: string
}

export interface ModelProvider {
  id: ProviderId
  name: string
  baseUrl: string
  /** 预设参考模型（仅作占位，正式以 API 拉取为准） */
  models: ModelOption[]
  note?: string
  supportsThinkingDisable?: boolean
}

export const PROVIDERS: ModelProvider[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    supportsThinkingDisable: true,
    models: [
      { id: 'deepseek-chat', label: 'deepseek-chat' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner' },
    ],
    note: '官方 · 点「拉取模型」获取真实列表',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', label: 'gpt-4o' },
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    ],
    note: '官方 · 点「拉取模型」获取真实列表',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [],
    note: '官方 · 模型以接口返回为准',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [],
    note: '官方 · 模型以接口返回为准',
  },
  {
    id: 'zhipu',
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [],
    note: '官方 · 模型以接口返回为准',
  },
  {
    id: 'custom',
    name: '自定义 / 中转站',
    baseUrl: '',
    models: [],
    note: '填入你的 OpenAI 兼容 Base URL，再拉取模型',
  },
]

export const DEEPSEEK_PROVIDER = PROVIDERS[0]

export const DEFAULT_PROVIDER_ID: ProviderId = 'deepseek'
export const DEFAULT_BASE_URL = DEEPSEEK_PROVIDER.baseUrl
export const DEFAULT_MODEL = 'deepseek-chat'

export function getProvider(id: ProviderId | string | undefined): ModelProvider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

export function getModelLabel(modelId: string): string {
  for (const p of PROVIDERS) {
    const hit = p.models.find((m) => m.id === modelId)
    if (hit) return hit.label
  }
  return modelId
}

export const MODEL_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.flatMap((p) => p.models.map((m) => [m.id, m.label])),
)
