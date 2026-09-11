const DB_NAME = 'KulanChatDB'
const DB_VERSION = 1

export const STORE = {
  messages: 'messages',
  memoryEpisodes: 'memoryEpisodes',
  memoryFacts: 'memoryFacts',
  meta: 'meta',
} as const

export const DEFAULT_CONTACT_ID = 'default'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE.messages)) {
        const s = db.createObjectStore(STORE.messages, { keyPath: 'id' })
        s.createIndex('contactId', 'contactId', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE.memoryEpisodes)) {
        const s = db.createObjectStore(STORE.memoryEpisodes, { keyPath: 'id' })
        s.createIndex('contactId', 'contactId', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE.memoryFacts)) {
        const s = db.createObjectStore(STORE.memoryFacts, { keyPath: 'id' })
        s.createIndex('contactId', 'contactId', { unique: false })
        s.createIndex('status', 'status', { unique: false })
        s.createIndex('subject', 'subject', { unique: false })
        s.createIndex('predicate', 'predicate', { unique: false })
        s.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.createObjectStore(STORE.meta, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB tx error'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB tx aborted'))
  })
}

export async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).put(value)
  await txDone(tx)
}

export async function idbPutAll<T>(storeName: string, values: T[]): Promise<void> {
  if (!values.length) return
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  for (const v of values) store.put(v)
  await txDone(tx)
}

export async function idbGetAllByIndex<T>(
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<T[]> {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readonly')
  const index = tx.objectStore(storeName).index(indexName)
  const req = index.getAll(key)
  const rows = await new Promise<T[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as T[]) || [])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  return rows
}

export async function idbClearByIndex(
  storeName: string,
  indexName: string,
  key: IDBValidKey,
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  const index = tx.objectStore(storeName).index(indexName)
  const req = index.openCursor(IDBKeyRange.only(key))
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
}

export async function idbGetMeta<T>(key: string): Promise<T | null> {
  const db = await openDb()
  const tx = db.transaction(STORE.meta, 'readonly')
  const req = tx.objectStore(STORE.meta).get(key)
  const row = await new Promise<{ key: string; value: T } | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as { key: string; value: T } | undefined)
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  return row ? row.value : null
}

export async function idbSetMeta<T>(key: string, value: T): Promise<void> {
  await idbPut(STORE.meta, { key, value })
}

export function memoryId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 关闭连接并删除整个 KulanChatDB（消息 / 事实 / episodes），用于测试重置 */
export async function deleteKulanChatDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise
      db.close()
    } catch {
      /* ignore */
    }
    dbPromise = null
  }

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('IndexedDB delete failed'))
    // 仍有连接占用时可能 blocked；稍后再 resolve，避免测试按钮卡死
    req.onblocked = () => {
      window.setTimeout(() => resolve(), 400)
    }
  })
}
