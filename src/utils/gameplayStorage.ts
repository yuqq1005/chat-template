/** 玩法四栏：设置与面板 id */

export type GameplayPanelId = 'status' | 'phone' | 'social' | 'promises'

export interface GameplayPanelConfig {
  /** 是否参与二次生成 + 展示 Tab */
  enabled: boolean
  /** 设置里可改的显示名（可自行加装饰） */
  label: string
}

export type GameplaySettings = Record<GameplayPanelId, GameplayPanelConfig>

export const GAMEPLAY_PANEL_ORDER: GameplayPanelId[] = [
  'status',
  'phone',
  'social',
  'promises',
]

export const DEFAULT_GAMEPLAY: GameplaySettings = {
  status: { enabled: true, label: '˚⊹ Fragment d\'ange · Journal d\'état ⊹˚' },
  phone: { enabled: true, label: '˚✧ Le thème principal de l\'amour · Mémoire téléphonique ✧˚' },
  social: { enabled: true, label: '⋆˖ Tout est à propos de toi · Cercle social ˖⋆' },
  promises: { enabled: true, label: '˚⋆ Archive des promesses · Souvenir d\'amour ⋆˚' },
}

const STORAGE_KEY = 'kulan.chat.gameplay'

function normalizePanel(
  id: GameplayPanelId,
  raw: Partial<GameplayPanelConfig> | undefined,
): GameplayPanelConfig {
  const fallback = DEFAULT_GAMEPLAY[id]
  const label =
    typeof raw?.label === 'string' && raw.label.trim()
      ? raw.label.trim().slice(0, 32)
      : fallback.label
  return {
    enabled: raw?.enabled != null ? Boolean(raw.enabled) : fallback.enabled,
    label,
  }
}

export function normalizeGameplaySettings(
  partial?: Partial<Record<GameplayPanelId, Partial<GameplayPanelConfig>>> | null,
): GameplaySettings {
  return {
    status: normalizePanel('status', partial?.status),
    phone: normalizePanel('phone', partial?.phone),
    social: normalizePanel('social', partial?.social),
    promises: normalizePanel('promises', partial?.promises),
  }
}

export function loadGameplay(): GameplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_GAMEPLAY }
    const parsed = JSON.parse(raw) as Partial<
      Record<GameplayPanelId, Partial<GameplayPanelConfig>>
    >
    return normalizeGameplaySettings(parsed)
  } catch {
    return { ...DEFAULT_GAMEPLAY }
  }
}

export function saveGameplay(settings: GameplaySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeGameplaySettings(settings)))
}

/** 当前启用的面板（二次请求只带这些） */
export function enabledGameplayPanels(settings: GameplaySettings): GameplayPanelId[] {
  return GAMEPLAY_PANEL_ORDER.filter((id) => settings[id].enabled)
}

export function hasAnyGameplayEnabled(settings: GameplaySettings): boolean {
  return enabledGameplayPanels(settings).length > 0
}
