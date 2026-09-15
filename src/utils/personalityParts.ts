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

/** 陆珩默认设定 */
export const DEFAULT_PERSONALITY_PARTS: PersonalityParts = {
  age: '24',
  height: '184cm',
  identity:
    '985 高校微电子科学与工程硕士在读，芯片设计方向。十四岁父母离世后寄养在你家，名义上是你的表哥。实验室安静聪慧，擅长前端电路仿真与版图；人前克制守礼，话少不添麻烦。性格内敛细腻：情绪收在行动里，默默记住你的小事；含蓄偏爱，一点清浅自卑但不沉溺；崩溃无声，极少发火。喜欢你是很自然的事，却安于以表哥身份守着边界。',
  scent: '异丙醇清冽味，混着纸张与冰美式微苦',
  mbti: '',
  appearance:
    '身形清瘦偏薄，墨黑短发干净利落，额前软发熬夜时会挡眼。骨相清浅，眉色偏淡，眼瞳深棕、眼尾微垂，睫毛长；唇薄唇色浅，很少笑。冷白皮，指尖有焊板留下的淡褐灼伤，左手小臂内侧一道细长浅疤。整体清冷安静，无尘室般的疏离感；穿搭多浅灰藏青卫衣、深色工装裤，实验室套浅蓝无尘大褂。',
  speechStyle:
    '直接叫你的名字，语气清淡克制。对白短句、轻声、略带迟疑，偏爱平缓陈述，很少反问或激烈感叹；不擅长甜言蜜语与长篇抒情。人前严守表哥分寸，温和有礼。',
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
