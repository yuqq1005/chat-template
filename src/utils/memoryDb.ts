import {
  DEFAULT_CONTACT_ID,
  STORE,
  idbGetAllByIndex,
  idbPut,
  idbPutAll,
  memoryId,
} from './idb'
import type { MemoryFact } from './memoryStorage'
import { createFact, loadMemory, saveMemory } from './memoryStorage'

export interface MemoryEpisode {
  id: string
  contactId: string
  type: 'memory_update'
  content: string
  source: 'secondary_model_memory_ops' | 'secondary_model_memory_diff' | 'manual'
  createdAt: number
  messageIds: string[]
  metadata?: Record<string, unknown>
}

export interface IdbMemoryFact extends MemoryFact {
  contactId: string
  sourceEpisodeId?: string
  validFrom?: number
  validTo?: number | null
  metadata?: Record<string, unknown>
}

export async function saveMemoryEpisode(ep: MemoryEpisode): Promise<void> {
  await idbPut(STORE.memoryEpisodes, ep)
}

export async function getEpisodesByContact(
  contactId = DEFAULT_CONTACT_ID,
): Promise<MemoryEpisode[]> {
  const rows = await idbGetAllByIndex<MemoryEpisode>(
    STORE.memoryEpisodes,
    'contactId',
    contactId,
  )
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getFactsByContact(
  contactId = DEFAULT_CONTACT_ID,
  activeOnly = false,
): Promise<IdbMemoryFact[]> {
  const rows = await idbGetAllByIndex<IdbMemoryFact>(
    STORE.memoryFacts,
    'contactId',
    contactId,
  )
  const list = activeOnly ? rows.filter((f) => f.status === 'active') : rows
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export async function saveFact(fact: IdbMemoryFact): Promise<void> {
  await idbPut(STORE.memoryFacts, fact)
}

export async function saveFacts(facts: IdbMemoryFact[]): Promise<void> {
  await idbPutAll(STORE.memoryFacts, facts)
}

/** 把旧 LocalStorage facts 迁进 IndexedDB（只跑一次） */
export async function migrateLegacyFactsIfNeeded(
  contactId = DEFAULT_CONTACT_ID,
): Promise<void> {
  const existing = await getFactsByContact(contactId, false)
  if (existing.length > 0) return

  const legacy = loadMemory()
  if (!legacy.facts.length) return

  const rows: IdbMemoryFact[] = legacy.facts.map((f) => ({
    ...f,
    contactId,
    validFrom: f.createdAt,
    validTo: f.status === 'inactive' ? f.updatedAt : null,
    metadata: { type: f.type, timeScope: f.timeScope, source: 'legacy_localStorage' },
  }))
  await saveFacts(rows)

  // 本地 settings 只保留表 + 轮数，facts 以 IDB 为准
  saveMemory({ ...legacy, facts: [] })
}

export async function upsertManualFact(
  factText: string,
  contactId = DEFAULT_CONTACT_ID,
  subject = '用户',
): Promise<IdbMemoryFact> {
  const base = createFact({
    subject,
    predicate: 'note',
    object: factText,
    factText,
  })
  const row: IdbMemoryFact = {
    ...base,
    contactId,
    validFrom: base.createdAt,
    validTo: null,
    metadata: { type: 'other', timeScope: 'long_term', source: 'manual' },
  }
  await saveFact(row)
  return row
}

export async function setFactStatus(
  id: string,
  status: 'active' | 'inactive',
  contactId = DEFAULT_CONTACT_ID,
): Promise<void> {
  const all = await getFactsByContact(contactId, false)
  const hit = all.find((f) => f.id === id)
  if (!hit) return
  const now = Date.now()
  await saveFact({
    ...hit,
    status,
    updatedAt: now,
    validTo: status === 'inactive' ? now : null,
  })
}

export { memoryId }
