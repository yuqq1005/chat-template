/** 角色设定：前端分栏编辑，落库仍合并为 CharacterCard.personality 单字段 */

export interface PersonalityParts {
  age: string
  height: string
  identity: string
  scent: string
  mbti: string
  appearance: string
  /** 口头禅、用词偏好等 */
  speechStyle: string
}

export const EMPTY_PERSONALITY_PARTS: PersonalityParts = {
  age: '',
  height: '',
  identity: '',
  scent: '',
  mbti: '',
  appearance: '',
  speechStyle: '',
}

const LABELS = {
  age: '年龄',
  height: '身高',
  identity: '身份',
  scent: '气味',
  mbti: 'MBTI',
  appearance: '外貌',
  speechStyle: '语言风格',
} as const

const LABEL_ORDER = [
  'age',
  'height',
  'identity',
  'scent',
  'mbti',
  'appearance',
  'speechStyle',
] as const satisfies ReadonlyArray<keyof PersonalityParts>

const LABEL_TO_KEY: Record<string, keyof PersonalityParts> = {
  年龄: 'age',
  身高: 'height',
  身份: 'identity',
  气味: 'scent',
  MBTI: 'mbti',
  mbti: 'mbti',
  外貌: 'appearance',
  语言风格: 'speechStyle',
}

/** 合并为单一 personality 文本（写入 LocalStorage / 注入 prompt） */
export function composePersonality(parts: PersonalityParts): string {
  return LABEL_ORDER.map((key) => {
    const value = parts[key].trim()
    return `${LABELS[key]}：${value}`
  }).join('\n')
}

export const LEGACY_DEFAULT_PERSONALITY =
  '北航航空航天工程系大二，20 岁，银白色短发。自信张扬，行动力强，ESTP。把用户当作「老板」，自己是「投资品」。'

const LEGACY_DEFAULT_PERSONALITY_QUOTES =
  '北航航空航天工程系大二，20 岁，银白色短发。自信张扬，行动力强，ESTP。把用户当作"老板"，自己是"投资品"。'

/** 贺之炀默认设定（由 LEGACY_DEFAULT_PERSONALITY 拆栏） */
export const DEFAULT_PERSONALITY_PARTS: PersonalityParts = {
  age: '20',
  height: '',
  identity: '北航航空航天工程系大二。把用户当作"老板"，自己是"投资品"。',
  scent: '',
  mbti: 'ESTP',
  appearance: '银白色短发',
  speechStyle: '自信张扬，行动力强',
}

export const DEFAULT_PERSONALITY_TEXT = composePersonality(DEFAULT_PERSONALITY_PARTS)

/**
 * 从 personality 文本拆回各栏。
 * 能识别「标签：」格式；旧版整段默认文案映射到各栏；其他自由文本落入「外貌」。
 */
export function parsePersonality(text: string): PersonalityParts {
  const raw = text.trim()
  if (!raw) return { ...EMPTY_PERSONALITY_PARTS }

  if (raw === LEGACY_DEFAULT_PERSONALITY || raw === LEGACY_DEFAULT_PERSONALITY_QUOTES) {
    return { ...DEFAULT_PERSONALITY_PARTS }
  }

  const hasLabeledLine = LABEL_ORDER.some((key) =>
    new RegExp(`(?:^|\\n)${LABELS[key]}[：:]`, 'm').test(raw),
  )

  if (!hasLabeledLine) {
    return { ...EMPTY_PERSONALITY_PARTS, appearance: raw }
  }

  const parts: PersonalityParts = { ...EMPTY_PERSONALITY_PARTS }
  const lines = raw.split(/\r?\n/)
  let current: keyof PersonalityParts | null = null
  const buckets: Partial<Record<keyof PersonalityParts, string[]>> = {}

  for (const line of lines) {
    const m = line.match(/^([^：:]+)[：:](.*)$/)
    const label = m?.[1]?.trim() ?? ''
    const key = LABEL_TO_KEY[label]
    if (key) {
      current = key
      const rest = (m?.[2] ?? '').trimStart()
      buckets[key] = rest ? [rest] : []
      continue
    }
    if (current) {
      if (!buckets[current]) buckets[current] = []
      buckets[current]!.push(line)
    }
  }

  for (const key of LABEL_ORDER) {
    const chunk = buckets[key]
    parts[key] = chunk ? chunk.join('\n').trim() : ''
  }

  return parts
}

/** 旧整段默认人设 → 分栏合并文本；已是标签格式则原样返回 */
export function normalizePersonalityStorage(text: string): string {
  const raw = text.trim()
  if (!raw || raw === LEGACY_DEFAULT_PERSONALITY || raw === LEGACY_DEFAULT_PERSONALITY_QUOTES) {
    return DEFAULT_PERSONALITY_TEXT
  }
  return raw
}
