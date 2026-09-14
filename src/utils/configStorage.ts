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
  /** 主剧情提示词篇幅：约 N–M 字（中文软引导，非硬截断） */
  outputCharsMin: number
  outputCharsMax: number
}

export type AppConfig = ApiConfig

/** 主剧情默认输出上限（可在「切换模型」里改） */
export const DEFAULT_MAX_TOKENS = 5000
export const MIN_MAX_TOKENS = 256
export const MAX_MAX_TOKENS = 16000

/** 提示词「篇幅」默认区间（与旧 DEFAULT_OUTPUT_FORMAT 一致） */
export const DEFAULT_OUTPUT_CHARS_MIN = 400
export const DEFAULT_OUTPUT_CHARS_MAX = 700
export const MIN_OUTPUT_CHARS = 50
export const MAX_OUTPUT_CHARS = 5000

export function normalizeMaxTokens(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_MAX_TOKENS
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(n)))
}

export function normalizeOutputCharsRange(
  minRaw: unknown,
  maxRaw: unknown,
): { outputCharsMin: number; outputCharsMax: number } {
  let min = typeof minRaw === 'number' ? minRaw : Number(minRaw)
  let max = typeof maxRaw === 'number' ? maxRaw : Number(maxRaw)
  if (!Number.isFinite(min)) min = DEFAULT_OUTPUT_CHARS_MIN
  if (!Number.isFinite(max)) max = DEFAULT_OUTPUT_CHARS_MAX
  min = Math.min(MAX_OUTPUT_CHARS, Math.max(MIN_OUTPUT_CHARS, Math.round(min)))
  max = Math.min(MAX_OUTPUT_CHARS, Math.max(MIN_OUTPUT_CHARS, Math.round(max)))
  if (min > max) {
    const t = min
    min = max
    max = t
  }
  return { outputCharsMin: min, outputCharsMax: max }
}

export const DEFAULT_CONFIG: AppConfig = {
  providerId: DEFAULT_PROVIDER_ID,
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.9,
  topP: 0.95,
  maxTokens: DEFAULT_MAX_TOKENS,
  outputCharsMin: DEFAULT_OUTPUT_CHARS_MIN,
  outputCharsMax: DEFAULT_OUTPUT_CHARS_MAX,
}

const CONFIG_KEY = 'kulan.chat.config'

export class ConfigStorage {
  static getConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (!stored) return { ...DEFAULT_CONFIG }
      const parsed = JSON.parse(stored) as Partial<AppConfig>
      const chars = normalizeOutputCharsRange(
        parsed.outputCharsMin ?? DEFAULT_OUTPUT_CHARS_MIN,
        parsed.outputCharsMax ?? DEFAULT_OUTPUT_CHARS_MAX,
      )
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        maxTokens: normalizeMaxTokens(parsed.maxTokens ?? DEFAULT_MAX_TOKENS),
        ...chars,
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      return { ...DEFAULT_CONFIG }
    }
  }

  static setConfig(config: AppConfig): void {
    const chars = normalizeOutputCharsRange(config.outputCharsMin, config.outputCharsMax)
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({
        ...config,
        maxTokens: normalizeMaxTokens(config.maxTokens),
        ...chars,
      }),
    )
  }

  static updateConfig(partial: Partial<AppConfig>): AppConfig {
    const prev = this.getConfig()
    const chars = normalizeOutputCharsRange(
      partial.outputCharsMin ?? prev.outputCharsMin,
      partial.outputCharsMax ?? prev.outputCharsMax,
    )
    const updated = {
      ...prev,
      ...partial,
      maxTokens: normalizeMaxTokens(partial.maxTokens ?? prev.maxTokens),
      ...chars,
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
      outputCharsMin: config.outputCharsMin,
      outputCharsMax: config.outputCharsMax,
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
