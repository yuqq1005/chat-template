/** 玩法四栏：设置、固定花体线、面板 id */

export type GameplayPanelId = 'status' | 'phone' | 'social' | 'promises'

export interface GameplayPanelConfig {
  /** 是否参与二次生成 + 展示 Tab */
  enabled: boolean
  /** 设置里可改的显示名 */
  label: string
}

export type GameplaySettings = Record<GameplayPanelId, GameplayPanelConfig>

/** 四栏各固定一套装饰（不交给模型即兴画） */
export const GAMEPLAY_DECORATIONS: Record<GameplayPanelId, string> = {
  status: '⊹ ───────── ʚ ɞ ───────── ⊹',
  phone: '° ⑅ ⊹ ˖ ⋯ ˖ ⊹ ♡ ⊹ ˖ ⋯ ˖ ⊹ ⑅ °',
  social: '。 ♡ · ° ʚ ∩⑅∩ ɞ ° · ♡ 。',
  promises: '⊹ ── ─ ─ ୨ ♡ ୧ ─ ─ ── ⊹',
}

export const GAMEPLAY_PANEL_ORDER: GameplayPanelId[] = [
  'status',
  'phone',
  'social',
  'promises',
]

export const DEFAULT_GAMEPLAY: GameplaySettings = {
  status: { enabled: true, label: '状态面板' },
  phone: { enabled: true, label: '手机动态' },
  social: { enabled: true, label: '社交圈' },
  promises: { enabled: true, label: '约定' },
}

const STORAGE_KEY = 'kulan.chat.gameplay'

function normalizePanel(
  id: GameplayPanelId,
  raw: Partial<GameplayPanelConfig> | undefined,
): GameplayPanelConfig {
  const fallback = DEFAULT_GAMEPLAY[id]
  const label =
    typeof raw?.label === 'string' && raw.label.trim()
      ? raw.label.trim().slice(0, 16)
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
