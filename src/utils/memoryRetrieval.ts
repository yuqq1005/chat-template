/** 结构化记忆检索：对齐 freeapp score / query / 去重 / 注入块 */

import type { MemoryFact } from './memoryStorage'

export type RetrievableFact = MemoryFact & {
  validTo?: number | null
  metadata?: Record<string, unknown>
  _retrievalScore?: number
}

export interface RetrieveMemoryOptions {
  limit?: number
  minScore?: number
  lastUserMessage?: string
  dedupeSimThreshold?: number
  maxPerPredicate?: number
}

const MEMORY_QUERY_STOP_WORDS = new Set([
  '用户',
  '角色',
  '今天',
  '现在',
  '感觉',
  '觉得',
  '这个',
  '那个',
  '什么',
  '就是',
  '可以',
  '不是',
  '没有',
  '真的',
  '好像',
  '一下',
  '有点',
  '还是',
  '然后',
  '但是',
  '因为',
  '所以',
  '我们',
  '你们',
  '他们',
  '自己',
  '东西',
  '事情',
  '问题',
])

function normalizeText(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function factMeta(fact: RetrievableFact): Record<string, unknown> {
  return (fact.metadata && typeof fact.metadata === 'object' ? fact.metadata : {}) as Record<
    string,
    unknown
  >
}

function factType(fact: RetrievableFact): string | undefined {
  const m = factMeta(fact)
  return fact.type ?? (m.type != null ? String(m.type) : undefined)
}

function factTimeScope(fact: RetrievableFact): string | undefined {
  const m = factMeta(fact)
  return fact.timeScope ?? (m.timeScope != null ? String(m.timeScope) : undefined)
}

function buildUsefulTokensFromNormalized(normalizedQuery: string): string[] {
  const tokens = String(normalizedQuery || '')
    .split(/[\s\n\r,，。.!！?？、；;:："'“”‘’（）()【】\[\]<>《》]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)

  const seen = new Set<string>()
  const usefulTokens: string[] = []
  for (const t of tokens) {
    if (seen.has(t)) continue
    seen.add(t)
    if (MEMORY_QUERY_STOP_WORDS.has(t)) continue
    usefulTokens.push(t)
  }
  return usefulTokens
}

function deriveFreshUserMessageText(lastUserMessage: string | undefined, queryText: string): string {
  if (lastUserMessage != null && String(lastUserMessage).trim() !== '') {
    return String(lastUserMessage)
  }
  const lines = String(queryText ?? '').split(/\n/)
  for (const line of lines) {
    if (line && line.trim()) return line
  }
  return ''
}

function factAgeDaysApprox(fact: RetrievableFact): number {
  const t = fact.updatedAt ?? fact.createdAt
  if (t == null || !Number.isFinite(t)) return 0
  return Math.max(0, (Date.now() - t) / 86400000)
}

function collectCjkNGrams(
  text: string,
  minLen: number,
  maxLen: number,
  maxCount: number,
): Set<string> {
  const norm = normalizeText(text)
  const runs = norm.match(/[\u4e00-\u9fff]+/g) || []
  const out = new Set<string>()
  outer: for (const run of runs) {
    const L = run.length
    if (!L) continue
    for (let len = minLen; len <= Math.min(maxLen, L); len++) {
      for (let i = 0; i + len <= L; i++) {
        out.add(run.slice(i, i + len))
        if (out.size >= maxCount) break outer
      }
    }
  }
  return out
}

function buildFactSearchText(fact: RetrievableFact): string {
  const parts: string[] = []
  if (fact.subject != null) parts.push(String(fact.subject))
  if (fact.predicate != null) parts.push(String(fact.predicate))
  if (fact.object != null) parts.push(String(fact.object))
  if (fact.factText != null) parts.push(String(fact.factText))
  const m = factMeta(fact)
  if (m.type != null) parts.push(String(m.type))
  if (m.timeScope != null) parts.push(String(m.timeScope))
  if (Array.isArray(m.entities)) {
    for (const e of m.entities) {
      if (!e || typeof e !== 'object') continue
      const ent = e as { name?: unknown; description?: unknown }
      if (ent.name != null) parts.push(String(ent.name))
      if (ent.description != null) parts.push(String(ent.description))
    }
  }
  return parts.join(' ')
}

/** 本轮用户句 + 最近 4 条消息（对齐 freeapp buildMemoryRetrievalQuery） */
export function buildMemoryRetrievalQuery(
  userInput: string,
  recentMessages: Array<{ content?: string }>,
): string {
  const parts: string[] = []
  if (userInput != null) parts.push(String(userInput))
  const tail = recentMessages.slice(-4)
  for (const m of tail) {
    parts.push(m?.content != null ? String(m.content) : '')
  }
  return parts.join('\n')
}

export function scoreMemoryFact(
  fact: RetrievableFact,
  queryText: string,
  lastUserMessage?: string,
): number {
  if (!fact || fact.status !== 'active') return -Infinity
  if (fact.validTo != null) return -Infinity

  const ty = factType(fact)
  const timeScope = factTimeScope(fact)
  const searchBlob = normalizeText(buildFactSearchText(fact))
  const qRaw = normalizeText(queryText)

  const imp =
    typeof fact.importance === 'number' && !Number.isNaN(fact.importance)
      ? Math.min(1, Math.max(0, fact.importance))
      : 0.5
  const conf =
    typeof fact.confidence === 'number' && !Number.isNaN(fact.confidence)
      ? Math.min(1, Math.max(0, fact.confidence))
      : 0.5

  let baseScore = 0
  baseScore += imp * 4
  baseScore += conf * 2
  if (timeScope === 'current') baseScore += 4
  if (ty === 'emotional_core') baseScore += 5
  if (ty === 'relationship') baseScore += 5
  if (ty === 'preference') baseScore += 3
  if (timeScope === 'long_term') baseScore += 2

  const futureIntentRegex =
    /(约定|答应|说好|说过|计划|安排|以后|之后|下次|明天|今晚|今天晚上|周末|未来|记得|别忘|提醒|要不要|什么时候|一起|见面|去哪|去哪里|做什么|到时候|回头|改天)/
  const hasFutureIntent = futureIntentRegex.test(qRaw)

  if (ty === 'promise' || ty === 'future_plan' || timeScope === 'future') {
    baseScore += 2
    if (hasFutureIntent) baseScore += 8
  }
  if (timeScope === 'temporary' || ty === 'current_state') {
    baseScore -= 3
  }

  let lexicalScore = 0
  const usefulTokens = buildUsefulTokensFromNormalized(qRaw)
  if (qRaw.length >= 4 && searchBlob.includes(qRaw)) {
    lexicalScore += 30
  }

  const subj = fact.subject != null ? normalizeText(fact.subject) : ''
  const pred = fact.predicate != null ? normalizeText(fact.predicate) : ''
  const obj = fact.object != null ? normalizeText(String(fact.object)) : ''
  const ft = fact.factText != null ? normalizeText(String(fact.factText)) : ''

  for (const t of usefulTokens) {
    if (!t || t.length < 2) continue
    if (searchBlob.includes(t)) lexicalScore += 5 + Math.min(t.length * 0.5, 5)
    if (obj.includes(t)) lexicalScore += 8
    if (ft.includes(t)) lexicalScore += 8
    if (pred.includes(t)) lexicalScore += 3
    if (subj.includes(t)) lexicalScore += 1
  }

  const freshPlain = deriveFreshUserMessageText(lastUserMessage, queryText)
  const freshTokens = buildUsefulTokensFromNormalized(normalizeText(freshPlain))
  let freshHitCount = 0
  for (const t of freshTokens) {
    if (!t || t.length < 2) continue
    if (searchBlob.includes(t)) freshHitCount++
  }

  let freshKeywordBoost = 0
  if (freshHitCount >= 1) {
    freshKeywordBoost = Math.min(15, 6 + (freshHitCount - 1) * 3)
  }

  let phraseBoost = 0
  const gramSet = collectCjkNGrams(freshPlain, 2, 4, 72)
  gramSet.forEach((g) => {
    if (!g || g.length < 2 || g.length > 4) return
    if (ft.includes(g)) phraseBoost += 4
  })
  phraseBoost = Math.min(12, phraseBoost)
  const freshQueryBoost = freshKeywordBoost + phraseBoost

  const stalePenalty = Math.min(5, factAgeDaysApprox(fact) * 0.1)
  const highFreshRelevance = freshHitCount >= 2 || phraseBoost >= 8
  let relevanceCompensation = 0
  if (highFreshRelevance) {
    relevanceCompensation = Math.min(15, 8 + freshHitCount * 2 + Math.floor(phraseBoost / 4))
  }

  let score = baseScore + lexicalScore + freshQueryBoost - stalePenalty + relevanceCompensation
  const hadObviousTextHit = lexicalScore > 0 || freshHitCount > 0 || phraseBoost > 0
  if (!hadObviousTextHit) score -= 4
  return score
}

function canonicalForExactKey(str: unknown): string {
  return String(str ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/[，,。．.!！?？、；;:\-—_·…'"“”‘’（）()[\]【】<>《》]/g, '')
    .trim()
}

function buildExactDedupeKey(fact: RetrievableFact): string {
  const s = canonicalForExactKey(fact.subject)
  const p = canonicalForExactKey(fact.predicate)
  const o = canonicalForExactKey(fact.object)
  if (s || p || o) return `spo:${s}|${p}|${o}`
  return `ft:${canonicalForExactKey(fact.factText)}`
}

function tokenSetForFactDedup(fact: RetrievableFact): Set<string> {
  const blob = normalizeText(
    [fact.factText, fact.subject, fact.object].map((x) => String(x ?? '')).join(' '),
  )
  const set = new Set<string>()
  if (blob.length > 0 && blob.length < 2) {
    set.add(blob)
    return set
  }
  const parts = blob.split(/[\s\n\r,，。.!！?？、；;:："'“”‘’（）()【】\[\]<>《》]+/)
  for (const p of parts) {
    const part = p.trim()
    if (part.length >= 2) set.add(part)
    const runs = part.match(/[\u4e00-\u9fff]+/g) || []
    for (const run of runs) {
      const L = run.length
      if (L < 2) continue
      let capped = 0
      for (let i = 0; i + 2 <= L && capped < 64; i++) {
        set.add(run.slice(i, i + 2))
        capped++
      }
    }
  }
  if (set.size === 0 && blob.length >= 2) set.add(blob.slice(0, 64))
  return set
}

function jaccardTokenSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0
  let inter = 0
  const smaller = setA.size <= setB.size ? setA : setB
  const larger = setA.size <= setB.size ? setB : setA
  smaller.forEach((t) => {
    if (larger.has(t)) inter++
  })
  const union = setA.size + setB.size - inter
  return union > 0 ? inter / union : 0
}

function jaccardThresholdForPair(fa: RetrievableFact, fb: RetrievableFact, base: number): number {
  const ta = factType(fa)
  const tb = factType(fb)
  const tsA = factTimeScope(fa)
  const tsB = factTimeScope(fb)
  if (
    ta === 'current_state' ||
    tb === 'current_state' ||
    tsA === 'temporary' ||
    tsB === 'temporary'
  ) {
    return Math.min(base, 0.72)
  }
  if (
    ta === 'preference' ||
    ta === 'relationship' ||
    tb === 'preference' ||
    tb === 'relationship'
  ) {
    return Math.max(base, 0.8)
  }
  return base
}

function exceedPredicateQuota(
  fact: RetrievableFact,
  kept: Array<{ fact: RetrievableFact; score: number }>,
  maxPerPredicate: number,
): boolean {
  if (!maxPerPredicate || maxPerPredicate <= 0) return false
  const key = canonicalForExactKey(fact.predicate)
  if (!key) return false
  let n = 0
  for (const item of kept) {
    if (canonicalForExactKey(item.fact.predicate) === key) n++
  }
  return n >= maxPerPredicate
}

function dedupeSimilarFacts(
  scoredItems: Array<{ fact: RetrievableFact; score: number }>,
  opts: { simThreshold?: number; maxPerPredicate?: number },
): Array<{ fact: RetrievableFact; score: number }> {
  const simThreshold = opts.simThreshold ?? 0.78
  const maxPerPredicate = opts.maxPerPredicate ?? 2
  const kept: Array<{ fact: RetrievableFact; score: number }> = []
  const seenExact = new Set<string>()

  for (const item of scoredItems) {
    if (!item?.fact) continue
    const f = item.fact
    const exactKey = buildExactDedupeKey(f)
    if (exactKey && seenExact.has(exactKey)) continue

    let tooSimilar = false
    const tokensF = tokenSetForFactDedup(f)
    for (const other of kept) {
      const th = jaccardThresholdForPair(f, other.fact, simThreshold)
      const sim = jaccardTokenSimilarity(tokensF, tokenSetForFactDedup(other.fact))
      if (sim >= th) {
        tooSimilar = true
        break
      }
    }
    if (tooSimilar) continue
    if (exceedPredicateQuota(f, kept, maxPerPredicate)) continue

    kept.push(item)
    if (exactKey) seenExact.add(exactKey)
  }
  return kept
}

/** 对齐 freeapp retrieveRelevantMemoryFacts（聊天常用 limit:10, minScore:7） */
export function retrieveRelevantMemoryFacts(
  facts: RetrievableFact[],
  queryText: string,
  options: RetrieveMemoryOptions = {},
): RetrievableFact[] {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25)
  const minScore = options.minScore ?? 7

  const scored = facts
    .map((f) => ({
      fact: f,
      score: scoreMemoryFact(f, queryText, options.lastUserMessage),
    }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score)

  let picked = scored.filter((x) => x.score >= minScore).slice(0, limit)
  if (picked.length === 0 && scored.length > 0 && scored[0].score > 0) {
    picked = scored.slice(0, Math.min(limit, 8))
  }

  picked = dedupeSimilarFacts(picked, {
    simThreshold: options.dedupeSimThreshold ?? 0.78,
    maxPerPredicate: options.maxPerPredicate ?? 2,
  }).slice(0, limit)

  return picked.map(({ fact, score }) => ({
    ...fact,
    _retrievalScore: score,
  }))
}

/** 对齐 freeapp buildRelevantMemoryFactsBlock */
export function buildRelevantMemoryFactsBlock(facts: RetrievableFact[]): string {
  if (!facts.length) return ''

  let out = '--- [相关结构化长期记忆] ---\n'
  out +=
    '以下是从长期记忆库中检索到的、与当前对话最相关的事实。请自然参考，不要机械复述，不要暴露数据库字段。\n\n'
  out += '<relevant_memory_facts>\n'

  facts.forEach((fact, idx) => {
    const ty = factType(fact)
    const timeScope = factTimeScope(fact)
    const mainLine = fact.factText || fact.object || '(无描述)'
    out += `${idx + 1}. ${mainLine}\n`
    if (ty != null) out += `   - 类型: ${ty}\n`
    if (timeScope != null) out += `   - 时间范围: ${timeScope}\n`
    if (typeof fact.confidence === 'number') out += `   - 可信度: ${fact.confidence}\n`
    if (typeof fact.importance === 'number') out += `   - 重要性: ${fact.importance}\n`
    out += '\n'
  })

  out += '</relevant_memory_facts>'
  return out
}
