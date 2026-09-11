export type BgSource = 'default' | 'custom'
export type BgAdjust = 'default' | 'immerse' | 'focus' | 'custom'

export interface BgSettings {
  source: BgSource
  adjust: BgAdjust
  /** object URL or bundled asset URL for custom upload */
  customUrl: string | null
}

export const DEFAULT_BG_PRESET =
  'https://img.lmaicdn.net/09328019-78f6-4a63-b284-867f2b7d6b63.jpg?x-oss-process=image%2Fresize%2Cw_200%2Fquality%2Cq_70%2Fformat%2Cwebp'

const STORAGE_KEY = 'kulan.chat.bg'

export const DEFAULT_BG_SETTINGS: BgSettings = {
  source: 'default',
  adjust: 'default',
  customUrl: null,
}

export function loadBgSettings(): BgSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_BG_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<BgSettings>
    return {
      ...DEFAULT_BG_SETTINGS,
      ...parsed,
      // custom blob URLs don't survive reload — fall back
      customUrl: null,
      source: parsed.source === 'custom' && !parsed.customUrl ? 'default' : parsed.source ?? 'default',
    }
  } catch {
    return { ...DEFAULT_BG_SETTINGS }
  }
}

export function saveBgSettings(settings: BgSettings) {
  const toStore: BgSettings = {
    ...settings,
    // don't persist blob: URLs
    customUrl: settings.customUrl?.startsWith('blob:') ? null : settings.customUrl,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
}

/** CSS knobs for frosted overlay by adjust mode */
export function bgAdjustStyle(adjust: BgAdjust): {
  blur: string
  brightness: string
  overlay: string
} {
  switch (adjust) {
    case 'immerse':
      return { blur: '0px', brightness: '1', overlay: 'rgba(0,0,0,0)' }
    case 'focus':
      return { blur: '12px', brightness: '0.55', overlay: 'rgba(7,8,12,0.35)' }
    case 'custom':
      return { blur: '4px', brightness: '0.85', overlay: 'rgba(7,8,12,0.12)' }
    case 'default':
    default:
      return { blur: '2px', brightness: '0.98', overlay: 'rgba(0,0,0,0.01)' }
  }
}
