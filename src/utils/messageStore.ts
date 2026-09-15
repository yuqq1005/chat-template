import type { UiMessage } from '../types'
import {
  DEFAULT_CONTACT_ID,
  STORE,
  idbClearByIndex,
  idbGetAllByIndex,
  idbPutAll,
} from './idb'

export interface StoredMessage extends UiMessage {
  contactId: string
  createdAt: number
}

export async function loadMessages(
  contactId = DEFAULT_CONTACT_ID,
): Promise<UiMessage[]> {
  const rows = await idbGetAllByIndex<StoredMessage>(
    STORE.messages,
    'contactId',
    contactId,
  )
  return rows
    .filter((m) => !m.pending)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .map(({ id, role, content, error, intro, scene, gameplay }) => ({
      id,
      role,
      content,
      ...(error ? { error: true } : {}),
      ...(intro ? { intro: true } : {}),
      ...(scene ? { scene } : {}),
      ...(gameplay ? { gameplay } : {}),
    }))
}

export async function saveMessages(
  messages: UiMessage[],
  contactId = DEFAULT_CONTACT_ID,
): Promise<void> {
  const durable = messages.filter((m) => !m.pending && m.content)
  await idbClearByIndex(STORE.messages, 'contactId', contactId)
  const rows: StoredMessage[] = durable.map((m, i) => {
    const { pending: _p, gameplayLoading: _gl, ...rest } = m
    return {
      ...rest,
      contactId,
      createdAt: Date.now() + i,
    }
  })
  await idbPutAll(STORE.messages, rows)
}

export async function clearMessages(contactId = DEFAULT_CONTACT_ID): Promise<void> {
  await idbClearByIndex(STORE.messages, 'contactId', contactId)
}
