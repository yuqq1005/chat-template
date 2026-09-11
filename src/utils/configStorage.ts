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
}

export type AppConfig = ApiConfig

export const DEFAULT_CONFIG: AppConfig = {
  providerId: DEFAULT_PROVIDER_ID,
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: DEFAULT_MODEL,
  temperature: 0.9,
  topP: 0.95,
}

const CONFIG_KEY = 'kulan.chat.config'

export class ConfigStorage {
  static getConfig(): AppConfig {
    try {
      const stored = localStorage.getItem(CONFIG_KEY)
      if (!stored) return { ...DEFAULT_CONFIG }
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
    } catch (error) {
      console.error('Failed to load config:', error)
      return { ...DEFAULT_CONFIG }
    }
  }

  static setConfig(config: AppConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }

  static updateConfig(partial: Partial<AppConfig>): AppConfig {
    const updated = { ...this.getConfig(), ...partial }
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
