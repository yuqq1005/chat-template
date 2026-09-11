/** 记忆：Markdown 表 + 结构化事实 + 上下文轮数 */

export interface MemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  factText: string
  status: 'active' | 'inactive'
  confidence: number
  importance: number
  type?: string
  timeScope?: string
  createdAt: number
  updatedAt: number
}

export interface MemorySettings {
  /** 发给模型的最近消息条数（上下文轮数控制） */
  contextMessageCount: number
  /** Markdown 记忆表 */
  memoryTable: string
  /** 结构化长期事实 */
  facts: MemoryFact[]
}

export const DEFAULT_MEMORY_TABLE = `# 角色设定
- 姓名：
- 性格特点：
- 性别：
- 说话风格：
- 职业：

# 用户设定
- 姓名：
- 性别：
- 与角色的关系：
- 用户性格：

# 背景设定
- 时间地点：
- 事件：

## 记忆表格

### 【现在】
| 项目 | 内容 |
|------|------|
| 地点 | 未知 |
| 人物 | 未知 |
| 时间 | 未知 |

### 【未来】
| 约定事项 | 详细内容 |
|----------|----------|

### 【过去】
| 人物 | 事件 | 地点 | 时间 |
|------|------|------|------|

### 【重要物品】
| 物品名称 | 物品描述 | 重要原因 |
|----------|----------|----------|
`

export const DEFAULT_MEMORY: MemorySettings = {
  contextMessageCount: 30,
  memoryTable: DEFAULT_MEMORY_TABLE,
  facts: [],
}

const STORAGE_KEY = 'kulan.chat.memory'

export function loadMemory(): MemorySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MEMORY, facts: [] }
    const parsed = JSON.parse(raw) as Partial<MemorySettings>
    return {
      ...DEFAULT_MEMORY,
      ...parsed,
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      memoryTable: parsed.memoryTable || DEFAULT_MEMORY_TABLE,
      contextMessageCount: Math.min(
        200,
        Math.max(4, Number(parsed.contextMessageCount) || 30),
      ),
    }
  } catch {
    return { ...DEFAULT_MEMORY, facts: [] }
  }
}

export function saveMemory(settings: MemorySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function createFact(
  partial: Pick<MemoryFact, 'subject' | 'predicate' | 'object' | 'factText'> &
    Partial<MemoryFact>,
): MemoryFact {
  const now = Date.now()
  return {
    id: `fact_${now}_${Math.random().toString(36).slice(2, 7)}`,
    subject: partial.subject,
    predicate: partial.predicate,
    object: partial.object,
    factText: partial.factText,
    status: partial.status ?? 'active',
    confidence: partial.confidence ?? 0.8,
    importance: partial.importance ?? 0.6,
    type: partial.type ?? 'other',
    timeScope: partial.timeScope ?? 'long_term',
    createdAt: now,
    updatedAt: now,
  }
}

/** 简易检索：按 query 子串打分，取 topN */
export function retrieveFacts(
  facts: MemoryFact[],
  query: string,
  limit = 10,
): MemoryFact[] {
  const q = query.trim().toLowerCase()
  if (!q) return facts.filter((f) => f.status === 'active').slice(0, limit)

  const scored = facts
    .filter((f) => f.status === 'active')
    .map((f) => {
      const hay = `${f.factText} ${f.subject} ${f.predicate} ${f.object}`.toLowerCase()
      let score = 0
      for (const token of q.split(/\s+/).filter(Boolean)) {
        if (hay.includes(token)) score += 10
      }
      score += (f.importance || 0) * 3
      score += (f.confidence || 0) * 2
      return { f, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => x.f)
}

export function buildMemoryFactsBlock(facts: MemoryFact[]): string {
  if (!facts.length) return ''
  let out = '--- [相关长期记忆] ---\n'
  out += '以下事实请自然参考，不要机械复述。\n\n'
  facts.forEach((fact, i) => {
    out += `${i + 1}. ${fact.factText}\n`
  })
  return out
}
