import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_ID,
  type ProviderId,
} from '../config/modelProviders'

export interface ApiConfig {
  providerId: ProviderId
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  topP: number
  /** 主剧情单次生成 max_tokens */
  maxTokens: number
}

export type AppConfig = ApiConfig

/** 主剧情默认输出上限（可在「切换模型」里改） */
export const DEFAULT_MAX_TOKENS = 5000
export const MIN_MAX_TOKENS = 256
export const MAX_MAX_TOKENS = 16000

export function normalizeMaxTokens(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_MAX_TOKENS
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(n)))
}

export const DEFAULT_CONFIG: AppConfig = {
  providerId: DEFAULT_PROVIDER_ID,
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.9,
  topP: 0.95,
  maxTokens: DEFAULT_MAX_TOKENS,
}

const CONFIG_KEY = 'kulan.chat.config'

export class ConfigStorage {
  static getConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (!stored) return { ...DEFAULT_CONFIG }
      const parsed = JSON.parse(stored) as Partial<AppConfig>
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        maxTokens: normalizeMaxTokens(parsed.maxTokens ?? DEFAULT_MAX_TOKENS),
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      return { ...DEFAULT_CONFIG }
    }
  }

  static setConfig(config: AppConfig): void {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        ...config,
        maxTokens: normalizeMaxTokens(config.maxTokens),
      }),
    )
  }

  static updateConfig(partial: Partial<AppConfig>): AppConfig {
    const updated = {
      ...this.getConfig(),
      ...partial,
      maxTokens: normalizeMaxTokens(
        partial.maxTokens ?? this.getConfig().maxTokens,
      ),
    }
    this.setConfig(updated)
    return updated
  }

  static getApiConfig(): ApiConfig {
    const config = this.getConfig()
    return {
      providerId: config.providerId,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      topP: config.topP,
      maxTokens: normalizeMaxTokens(config.maxTokens),
    }
  }

  static hasApiKey(): boolean {
    const { apiKey, baseUrl } = this.getConfig()
    return Boolean(apiKey && baseUrl)
  }
}

export const getConfig = () => ConfigStorage.getConfig()
export const setConfig = (config: AppConfig) => ConfigStorage.setConfig(config)
export const updateConfig = (partial: Partial<AppConfig>) =>
  ConfigStorage.updateConfig(partial)
export const getApiConfig = () => ConfigStorage.getApiConfig()
export const hasApiKey = () => ConfigStorage.hasApiKey()
