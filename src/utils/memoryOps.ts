import { getProvider } from '../config/modelProviders'
import { AiCaller } from './aiCaller'
import type { CharacterCard } from './characterStorage'
import { getApiConfig } from './configStorage'
import {
  getFactsByContact,
  memoryId,
  saveFact,
  saveFacts,
  saveMemoryEpisode,
  type IdbMemoryFact,
  type MemoryEpisode,
} from './memoryDb'
import { DEFAULT_CONTACT_ID } from './idb'
import { loadMemory, saveMemory, type MemoryFact } from './memoryStorage'

export interface MemoryOps {
  entities?: Array<{
    name?: string
    type?: string
    aliases?: string[]
    description?: string
  }>
  facts_to_add?: Array<{
    subject?: string
    predicate?: string
    object?: string
    factText?: string
    type?: string
    timeScope?: string
    confidence?: number
    importance?: number
  }>
  facts_to_invalidate?: Array<{
    subject?: string
    predicate?: string
    reason?: string
  }>
}

export function buildMemoryUpdatePrompt(charName: string, userName: string): string {
  return `你是一个后台记忆整理引擎。
你的任务是冷酷、客观地分析用户(${userName})和角色(${charName})的最新对话，提取对长期对话有用的结构化事实，并（可选）输出兼容旧版的 Markdown 记忆表增量。

【优先输出】你必须首先输出 \`<memory_ops>\`…\`</memory_ops>\`，内部为一个 JSON 对象（不要在外面套数组）。格式如下（字段必须齐全；无内容时用空数组）：
<memory_ops>
{
  "entities": [
    {
      "name": "实体名",
      "type": "person | place | item | event | concept | relationship | preference | promise | other",
      "aliases": [],
      "description": "简短说明"
    }
  ],
  "facts_to_add": [
    {
      "subject": "主体实体名",
      "predicate": "关系/属性名，例如 current_location, likes, promised, owns, relationship_with_user",
      "object": "客体或属性值",
      "factText": "自然语言事实描述",
      "type": "profile | current_state | past_event | future_plan | relationship | item | preference | emotional_core | other",
      "timeScope": "current | long_term | past | future | temporary",
      "confidence": 0.85,
      "importance": 0.6
    }
  ],
  "facts_to_invalidate": [
    {
      "subject": "主体实体名",
      "predicate": "需要失效的关系/属性名",
      "reason": "为什么旧事实失效"
    }
  ]
}
</memory_ops>

记录原则：
- 只记录对长期对话有用的事实；不要记录普通寒暄、一次性无意义动作。
- 用户偏好、关系变化、约定、重要物品、地点状态、身份设定、情绪核心优先。
- 若新事实明显替代旧事实，必须在 facts_to_invalidate 中写明被替代的 subject+predicate。
- 增量写入：已在【已有事实】中的 subject+predicate 不要重复输出，除非 object 已变化。
- 硬性上限：facts_to_add 每次最多 8 条；entities 只列本轮新实体，description 不超过 30 字。
- 优先保证 JSON 完整闭合；宁可少写，也不要截断。无新情报时用空数组并完整输出闭合标签。
- \`<memory_ops>\` 之外不要输出任何解释或对话。

【兼容旧版】\`<memory_ops>\` 闭合后再输出 \`<memory_diff>\`。无变更时输出 \`<memory_diff>[]</memory_diff>\`。

记忆表只维护：\`# 背景设定\`（列表 \`- 键：值\`）以及下方 \`### 【现在】/【未来】/【过去】/【重要物品】\` 表格。
不要输出或编造「角色设定 / 用户设定」区块（角色与用户人设由角色卡提供，不在此表）。

memory_diff 示例：
[
  {"op": "update", "section": "背景设定", "key": "时间地点", "value": "初夏夜晚·便利店门口"},
  {"op": "update", "section": "现在", "key": "地点", "value": "便利店门口路灯下"},
  {"op": "append", "section": "过去", "line": "| 贺之炀 | 递薄荷糖 | 便利店 | 今晚 |"},
  {"op": "delete", "section": "现在", "keyword": "未知"}
]

输出顺序：先完整 \`<memory_ops>\`，再 \`<memory_diff>\`。`
}

function stripJsonFence(raw: string): string {
  return raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim()
}

/** 截断时没有闭合标签也要取出内容 */
function extractTaggedBlock(text: string, tag: string, stopAt?: string): string | null {
  const open = `<${tag}>`
  const close = `</${tag}>`
  const i = text.indexOf(open)
  if (i < 0) return null
  const start = i + open.length
  const j = text.indexOf(close, start)
  if (j >= 0) return stripJsonFence(text.slice(start, j))
  let end = text.length
  if (stopAt) {
    const k = text.indexOf(stopAt, start)
    if (k >= 0) end = k
  }
  return stripJsonFence(text.slice(start, end))
}

function tryParseJson(jsonStr: string): unknown | null {
  try {
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

function sliceBalanced(src: string, start: number): { value: string; end: number } | null {
  const open = src[start]
  const close = open === '{' ? '}' : open === '[' ? ']' : ''
  if (!close) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return { value: src.slice(start, i + 1), end: i + 1 }
    }
  }
  return null
}

function extractCompleteJsonValues(src: string): unknown[] {
  const out: unknown[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ']') break
    if (ch === '{' || ch === '[') {
      const sliced = sliceBalanced(src, i)
      if (!sliced) break
      const parsed = tryParseJson(sliced.value)
      if (parsed === null) break
      out.push(parsed)
      i = sliced.end
      continue
    }
    i++
  }
  return out
}

function extractNamedArray(raw: string, key: string): unknown[] {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[`)
  const m = re.exec(raw)
  if (!m || m.index == null) return []
  return extractCompleteJsonValues(raw.slice(m.index + m[0].length))
}

function salvageMemoryOps(raw: string): MemoryOps | null {
  const entities = extractNamedArray(raw, 'entities') as MemoryOps['entities']
  const facts_to_add = extractNamedArray(raw, 'facts_to_add') as MemoryOps['facts_to_add']
  const facts_to_invalidate = extractNamedArray(
    raw,
    'facts_to_invalidate',
  ) as MemoryOps['facts_to_invalidate']
  if (!entities?.length && !facts_to_add?.length && !facts_to_invalidate?.length) return null
  return { entities, facts_to_add, facts_to_invalidate }
}

export function parseMemoryOps(responseText: string): MemoryOps | null {
  if (!responseText) return null
  const raw = extractTaggedBlock(responseText, 'memory_ops', '<memory_diff>')
  if (raw == null) return null
  const parsed = tryParseJson(raw)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as MemoryOps
  }
  const salvaged = salvageMemoryOps(raw)
  if (salvaged) {
    console.warn(
      '[结构化记忆] memory_ops 不完整，已抢救',
      salvaged.facts_to_add?.length ?? 0,
      '条事实',
    )
    return salvaged
  }
  console.warn('[结构化记忆] memory_ops 解析失败')
  return null
}

export function parseMemoryDiff(responseText: string): unknown[] | null {
  const raw = extractTaggedBlock(responseText, 'memory_diff')
  if (raw == null) return null
  const parsed = tryParseJson(raw)
  if (Array.isArray(parsed)) return parsed
  return extractCompleteJsonValues(raw.startsWith('[') ? raw.slice(1) : raw)
}

type DiffOp = {
  op?: string
  section?: string
  key?: string
  value?: string
  line?: string
  keyword?: string
}

export function applyMemoryDiff(oldMarkdown: string, operations: DiffOp[]): string {
  if (!oldMarkdown) return ''
  let lines = oldMarkdown.split(/\r?\n/)
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const isHeading = (line: string) => /^#{1,6}\s+\S/.test(line.trim())

  for (const op of operations) {
    const sectionName = op.section != null ? String(op.section) : ''
    if (!sectionName) continue

    const primaryHeader = `### 【${sectionName}】`
    let startIndex = lines.findIndex((l) => l.includes(primaryHeader))
    if (startIndex === -1) {
      const fallbackRe = new RegExp(`^#\\s+${escapeRegExp(sectionName)}\\s*$`)
      startIndex = lines.findIndex((l) => fallbackRe.test(l.trim()))
    }
    if (startIndex === -1) continue

    let endIndex = lines.length
    for (let j = startIndex + 1; j < lines.length; j++) {
      if (isHeading(lines[j])) {
        endIndex = j
        break
      }
    }

    if (op.op === 'update' && op.key != null) {
      for (let i = startIndex; i < endIndex; i++) {
        if (lines[i].includes(`| ${op.key} |`)) {
          lines[i] = `| ${op.key} | ${op.value ?? ''} |`
          break
        }
      }
    } else if (op.op === 'append' && op.line) {
      let insertIndex = endIndex
      while (insertIndex > startIndex && lines[insertIndex - 1].trim() === '') insertIndex--
      lines.splice(insertIndex, 0, op.line.trim())
    } else if (op.op === 'delete' && op.keyword) {
      for (let i = startIndex; i < endIndex; i++) {
        if (lines[i].includes(op.keyword)) {
          lines.splice(i, 1)
          i--
          endIndex--
        }
      }
    }
  }
  return lines.join('\n')
}

function factIdentity(subject?: string, predicate?: string): string {
  return `${String(subject || '').trim()}|${String(predicate || '').trim()}`
}

function clamp01(n: number, fallback: number): number {
  return typeof n === 'number' && !Number.isNaN(n) ? Math.min(1, Math.max(0, n)) : fallback
}

export async function applyMemoryOps(
  contactId: string,
  memoryOps: MemoryOps,
  sourceEpisodeId: string,
): Promise<{ added: number; updated: number; invalidated: number }> {
  const now = Date.now()
  const active = await getFactsByContact(contactId, true)
  let invalidated = 0
  const invalidatedIds = new Set<string>()

  for (const inv of memoryOps.facts_to_invalidate || []) {
    if (!inv || typeof inv !== 'object') continue
    const subj = inv.subject != null ? String(inv.subject) : ''
    const pred = inv.predicate != null ? String(inv.predicate) : ''
    const reason = inv.reason != null ? String(inv.reason) : ''
    for (const f of active) {
      if (invalidatedIds.has(f.id)) continue
      if (f.subject === subj && f.predicate === pred) {
        await saveFact({
          ...f,
          status: 'inactive',
          validTo: now,
          updatedAt: now,
          metadata: { ...(f.metadata || {}), invalidationReason: reason },
        })
        invalidatedIds.add(f.id)
        invalidated++
      }
    }
  }

  const entitiesBlock = Array.isArray(memoryOps.entities) ? memoryOps.entities : []
  const byKey = new Map<string, IdbMemoryFact>()
  for (const f of active) {
    if (invalidatedIds.has(f.id)) continue
    const key = factIdentity(f.subject, f.predicate)
    if (key === '|') continue
    if (!byKey.has(key)) byKey.set(key, f)
  }

  const toAdd: IdbMemoryFact[] = []
  const toUpdate: IdbMemoryFact[] = []
  const seenInBatch = new Set<string>()

  for (const item of memoryOps.facts_to_add || []) {
    if (!item || typeof item !== 'object') continue
    const subject = item.subject != null ? String(item.subject) : ''
    const predicate = item.predicate != null ? String(item.predicate) : ''
    const object = item.object != null ? String(item.object) : ''
    const factText =
      item.factText != null ? String(item.factText) : `${subject} ${predicate} ${object}`.trim()
    if (!factText) continue

    const key = factIdentity(subject, predicate)
    if (key !== '|' && seenInBatch.has(key)) continue
    if (key !== '|') seenInBatch.add(key)

    const conf = clamp01(item.confidence as number, 0.7)
    const imp = clamp01(item.importance as number, 0.5)
    const existing = key !== '|' ? byKey.get(key) : undefined
    if (existing) {
      if (existing.object === object && existing.factText === factText) continue
      toUpdate.push({
        ...existing,
        object,
        factText,
        confidence: conf,
        importance: imp,
        type: item.type ?? existing.type,
        timeScope: item.timeScope ?? existing.timeScope,
        sourceEpisodeId,
        updatedAt: now,
        metadata: {
          ...(existing.metadata || {}),
          type: item.type ?? existing.type,
          timeScope: item.timeScope ?? existing.timeScope,
          entities: entitiesBlock,
          source: 'memory_ops',
        },
      })
      continue
    }

    toAdd.push({
      id: memoryId('fact'),
      contactId,
      subject,
      predicate,
      object,
      factText,
      sourceEpisodeId,
      confidence: conf,
      importance: imp,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      validFrom: now,
      validTo: null,
      type: item.type,
      timeScope: item.timeScope,
      metadata: {
        type: item.type,
        timeScope: item.timeScope,
        entities: entitiesBlock,
        source: 'memory_ops',
      },
    })
  }

  if (toAdd.length) await saveFacts(toAdd)
  for (const row of toUpdate) await saveFact(row)
  return { added: toAdd.length, updated: toUpdate.length, invalidated }
}

export async function runSecondaryMemoryUpdate(options: {
  character: CharacterCard
  conversationTail: Array<{ role: string; content: string }>
  assistantReply: string
  contactId?: string
}): Promise<{ ok: boolean; message: string }> {
  const contactId = options.contactId ?? DEFAULT_CONTACT_ID
  if (options.character.memoryEngineEnabled === false) {
    return { ok: true, message: '已关闭后台记忆整理，跳过' }
  }
  const cfg = getApiConfig()
  if (!cfg.apiKey || !cfg.baseUrl) {
    return { ok: false, message: '缺少 API 配置，跳过记忆更新' }
  }

  const charName = options.character.name || '对方'
  const userName = options.character.userName || '用户'
  const mem = loadMemory()

  let conversationText = '【最新对话记录】\n'
  for (const msg of options.conversationTail) {
    const who = msg.role === 'user' ? userName : charName
    conversationText += `${who}：${msg.content}\n`
  }
  conversationText += `${charName}：${options.assistantReply}\n`

  const existingFacts = await getFactsByContact(contactId, true)
  const existingBlock =
    existingFacts.length === 0
      ? '（暂无）'
      : existingFacts
          .slice(0, 60)
          .map((f) => `- ${f.subject} / ${f.predicate} = ${f.object || f.factText}`)
          .join('\n')

  const systemPrompt = buildMemoryUpdatePrompt(charName, userName)
  const userContent = `请分析以下对话记录并提取情报。\n\n${conversationText}\n\n【输出要求】\n1. 必须完整闭合 <memory_ops> … </memory_ops>。只写本轮新增或发生变化的事实，已有事实不要重复。facts_to_add 最多 8 条。\n2. 无表格变更时输出 <memory_diff>[]</memory_diff>。\n\n【已有事实】\n${existingBlock}\n\n【当前记忆表】\n<current_memory>\n${mem.memoryTable}\n</current_memory>`

  const provider = getProvider(cfg.providerId)
  const caller = new AiCaller({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 4096,
    disableThinking: Boolean(provider.supportsThinkingDisable),
  })

  try {
    const { content, finishReason } = await caller.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ])
    if (finishReason === 'length') {
      console.warn('[副模型记忆] 输出被 max_tokens 截断，尝试抢救已完整条目')
    }

    const ops = parseMemoryOps(content)
    let opsApplied = false
    let added = 0
    let updated = 0
    let invalidated = 0

    if (ops) {
      const episode: MemoryEpisode = {
        id: memoryId('episode'),
        contactId,
        type: 'memory_update',
        content: conversationText,
        source: 'secondary_model_memory_ops',
        createdAt: Date.now(),
        messageIds: [],
        metadata: { memoryOps: ops, oldMemoryLength: mem.memoryTable.length, finishReason },
      }
      await saveMemoryEpisode(episode)
      const result = await applyMemoryOps(contactId, ops, episode.id)
      added = result.added
      updated = result.updated
      invalidated = result.invalidated
      opsApplied = true
    }

    const diff = parseMemoryDiff(content)
    if (diff && diff.length > 0) {
      const patched = applyMemoryDiff(mem.memoryTable, diff as DiffOp[])
      saveMemory({ ...mem, memoryTable: patched, facts: [] })
      if (!opsApplied) {
        const episode: MemoryEpisode = {
          id: memoryId('episode'),
          contactId,
          type: 'memory_update',
          content: conversationText,
          source: 'secondary_model_memory_diff',
          createdAt: Date.now(),
          messageIds: [],
          metadata: { rawDiff: diff },
        }
        await saveMemoryEpisode(episode)
      }
    }

    if (!ops && (!diff || diff.length === 0)) {
      return { ok: true, message: '副模型未产出可解析记忆变更' }
    }

    return {
      ok: true,
      message: opsApplied
        ? `记忆已更新：+${added} / 更新 ${updated} / 失效 ${invalidated}`
        : '记忆表已按 diff 更新',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '未知错误'
    console.warn('[副模型记忆] 失败（不影响聊天）:', msg)
    return { ok: false, message: msg }
  }
}

/** 供检索：优先 IDB，空则回退 local settings.facts */
export async function loadFactsForRetrieval(
  contactId = DEFAULT_CONTACT_ID,
): Promise<MemoryFact[]> {
  const rows = await getFactsByContact(contactId, true)
  if (rows.length) return rows
  return loadMemory().facts.filter((f) => f.status === 'active')
}
