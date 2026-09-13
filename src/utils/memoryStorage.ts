/** 记忆：Markdown 表 + 结构化事实 + 上下文轮数 */

import {
  buildRelevantMemoryFactsBlock,
  retrieveRelevantMemoryFacts,
} from './memoryRetrieval'

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

export const DEFAULT_MEMORY_TABLE = `# 背景设定
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

/** 去掉旧版记忆表顶部的角色/用户设定块（已迁到角色卡） */
export function stripLegacyMemoryProfileSections(markdown: string): string {
  if (!markdown.trim()) return DEFAULT_MEMORY_TABLE
  if (!markdown.includes('# 角色设定') && !markdown.includes('# 用户设定')) {
    return markdown
  }
  const parts = markdown.split(/(?=^# )/m)
  const kept = parts.filter((part) => {
    const head = (part.split(/\r?\n/)[0] || '').trim()
    return head !== '# 角色设定' && head !== '# 用户设定'
  })
  const next = kept.join('').replace(/^\s+/, '').trim()
  return next || DEFAULT_MEMORY_TABLE
}

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
    const memoryTable = stripLegacyMemoryProfileSections(
      parsed.memoryTable || DEFAULT_MEMORY_TABLE,
    )
    return {
      ...DEFAULT_MEMORY,
      ...parsed,
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      memoryTable,
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
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...settings,
      memoryTable: stripLegacyMemoryProfileSections(settings.memoryTable),
    }),
  )
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

/** 兼容旧调用；新代码请直接用 memoryRetrieval.retrieveRelevantMemoryFacts */
export function retrieveFacts(
  facts: MemoryFact[],
  query: string,
  limit = 10,
): MemoryFact[] {
  return retrieveRelevantMemoryFacts(facts, query, {
    limit,
    minScore: 7,
    lastUserMessage: query,
  })
}

/** 注入块：委托 memoryRetrieval（对齐 freeapp 富格式） */
export function buildMemoryFactsBlock(facts: MemoryFact[]): string {
  return buildRelevantMemoryFactsBlock(facts)
}
