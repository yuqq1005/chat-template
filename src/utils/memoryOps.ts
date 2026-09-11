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
- \`<memory_ops>\` 之外不要输出任何解释或对话。

【兼容旧版】为保持 Markdown 记忆表更新，请在 \`<memory_ops>\` 之后同时输出 \`<memory_diff>\`…\`</memory_diff>\`，内部为 JSON 数组。若无表格变更，必须输出：\`<memory_diff>[]</memory_diff>\`。

memory_diff 支持的操作示例：
[
  {"op": "update", "section": "现在", "key": "地点", "value": "新地点"},
  {"op": "append", "section": "过去", "line": "| 人物 | 事件 | 地点 | 时间 |"},
  {"op": "delete", "section": "现在", "keyword": "旧地点"}
]

输出顺序要求：先完整的 \`<memory_ops>\` 块，再 \`<memory_diff>\` 块；不要颠倒。`
}

export function parseMemoryOps(responseText: string): MemoryOps | null {
  if (!responseText) return null
  try {
    const match = responseText.match(/<memory_ops>([\s\S]*?)<\/memory_ops>/)
    if (!match) return null
    let jsonStr = match[1].trim()
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(jsonStr) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as MemoryOps
  } catch (e) {
    console.warn('[结构化记忆] memory_ops 解析失败:', e)
    return null
  }
}

export function parseMemoryDiff(responseText: string): unknown[] | null {
  try {
    const match = responseText.match(/<memory_diff>([\s\S]*?)<\/memory_diff>/)
    if (!match) return null
    let jsonStr = match[1].trim()
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(jsonStr) as unknown
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
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

export async function applyMemoryOps(
  contactId: string,
  memoryOps: MemoryOps,
  sourceEpisodeId: string,
): Promise<{ added: number; invalidated: number }> {
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
  const toAdd: IdbMemoryFact[] = []
  for (const item of memoryOps.facts_to_add || []) {
    if (!item || typeof item !== 'object') continue
    const conf =
      typeof item.confidence === 'number' && !Number.isNaN(item.confidence)
        ? Math.min(1, Math.max(0, item.confidence))
        : 0.7
    const imp =
      typeof item.importance === 'number' && !Number.isNaN(item.importance)
        ? Math.min(1, Math.max(0, item.importance))
        : 0.5
    const factText =
      item.factText != null
        ? String(item.factText)
        : `${item.subject ?? ''} ${item.predicate ?? ''} ${item.object ?? ''}`.trim()
    if (!factText) continue

    toAdd.push({
      id: memoryId('fact'),
      contactId,
      subject: item.subject != null ? String(item.subject) : '',
      predicate: item.predicate != null ? String(item.predicate) : '',
      object: item.object != null ? String(item.object) : '',
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
  return { added: toAdd.length, invalidated }
}

export async function runSecondaryMemoryUpdate(options: {
  character: CharacterCard
  conversationTail: Array<{ role: string; content: string }>
  assistantReply: string
  contactId?: string
}): Promise<{ ok: boolean; message: string }> {
  const contactId = options.contactId ?? DEFAULT_CONTACT_ID
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

  const systemPrompt = buildMemoryUpdatePrompt(charName, userName)
  const userContent = `请分析以下对话记录并提取情报。\n\n${conversationText}\n\n【输出要求】\n1. 严格按照系统提示：优先输出完整的 <memory_ops> … </memory_ops>（JSON 对象）。\n2. 为兼容旧版，请再输出 <memory_diff> … </memory_diff> 以更新下方 Markdown 记忆表；无表格变更时输出 <memory_diff>[]</memory_diff>。\n\n【当前记忆状态】：\n<current_memory>\n${mem.memoryTable}\n</current_memory>`

  const provider = getProvider(cfg.providerId)
  const caller = new AiCaller({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 2000,
    disableThinking: Boolean(provider.supportsThinkingDisable),
  })

  try {
    const { content } = await caller.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ])

    const ops = parseMemoryOps(content)
    let opsApplied = false
    let added = 0
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
        metadata: { memoryOps: ops, oldMemoryLength: mem.memoryTable.length },
      }
      await saveMemoryEpisode(episode)
      const result = await applyMemoryOps(contactId, ops, episode.id)
      added = result.added
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
        ? `记忆已更新：+${added} / 失效 ${invalidated}`
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
