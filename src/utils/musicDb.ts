/** 独立音乐库：清聊天（KulanChatDB）时保留歌单 */

import defaultAfroJazzUrl from '../music/default-afro-jazz.mp3'

const DB_NAME = 'KulanMusicDB'
const DB_VERSION = 1
const STORE_TRACKS = 'tracks'

/** 默认曲目固定 id；用户删除后靠 localStorage 标记不再自动加回 */
export const DEFAULT_MUSIC_TRACK_ID = 'default_afro_jazz'
const DEFAULT_SEED_KEY = 'kulan.chat.music.defaultSeeded'
const DEFAULT_MUSIC_TITLE = '你是怎样的一个人 - Afro Jazz (耳目一新)'

export interface StoredMusicTrack {
  id: string
  title: string
  mimeType: string
  createdAt: number
  order: number
  blob: Blob
}

/** 播放器用的轻量曲目（url 为运行时 createObjectURL） */
export interface MusicTrack {
  id: string
  title: string
  url: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const s = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' })
        s.createIndex('order', 'order', { unique: false })
        s.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('KulanMusicDB open failed'))
  })
  return dbPromise
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('KulanMusicDB tx error'))
    tx.onabort = () => reject(tx.error ?? new Error('KulanMusicDB tx aborted'))
  })
}

function hasSeededDefault(): boolean {
  try {
    return localStorage.getItem(DEFAULT_SEED_KEY) === '1'
  } catch {
    return false
  }
}

function markDefaultSeeded(): void {
  try {
    localStorage.setItem(DEFAULT_SEED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function listStoredMusicTracks(): Promise<StoredMusicTrack[]> {
  const db = await openDb()
  const tx = db.transaction(STORE_TRACKS, 'readonly')
  const req = tx.objectStore(STORE_TRACKS).getAll()
  const rows = await new Promise<StoredMusicTrack[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as StoredMusicTrack[]) || [])
    req.onerror = () => reject(req.error)
  })
  await txDone(tx)
  return rows.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
}

export async function addMusicTrackFromFile(
  file: File,
  meta: { id: string; title: string },
): Promise<MusicTrack> {
  const db = await openDb()
  const existing = await listStoredMusicTracks()
  const order = existing.length ? Math.max(...existing.map((t) => t.order)) + 1 : 0
  const row: StoredMusicTrack = {
    id: meta.id,
    title: meta.title,
    mimeType: file.type || 'audio/mpeg',
    createdAt: Date.now(),
    order,
    blob: file,
  }
  const tx = db.transaction(STORE_TRACKS, 'readwrite')
  tx.objectStore(STORE_TRACKS).put(row)
  await txDone(tx)
  return {
    id: row.id,
    title: row.title,
    url: URL.createObjectURL(row.blob),
  }
}

/** 首次打开且歌单为空时写入默认曲目；用户删除后不再自动恢复 */
export async function ensureDefaultMusicTrack(): Promise<void> {
  if (hasSeededDefault()) return

  const existing = await listStoredMusicTracks()
  if (existing.some((t) => t.id === DEFAULT_MUSIC_TRACK_ID)) {
    markDefaultSeeded()
    return
  }
  // 已有自建歌单：只打标，不强制插入
  if (existing.length > 0) {
    markDefaultSeeded()
    return
  }

  try {
    const res = await fetch(defaultAfroJazzUrl)
    if (!res.ok) throw new Error(`fetch default track failed: ${res.status}`)
    const blob = await res.blob()
    const file = new File([blob], `${DEFAULT_MUSIC_TITLE}.mp3`, {
      type: blob.type || 'audio/mpeg',
    })
    await addMusicTrackFromFile(file, {
      id: DEFAULT_MUSIC_TRACK_ID,
      title: DEFAULT_MUSIC_TITLE,
    })
  } catch (e) {
    console.warn('[音乐] 写入默认曲目失败:', e)
    return
  }
  markDefaultSeeded()
}

/** 从 IDB 加载并生成可播放 url（调用方负责在卸载时 revoke） */
export async function loadMusicPlaylist(): Promise<MusicTrack[]> {
  await ensureDefaultMusicTrack()
  const rows = await listStoredMusicTracks()
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: URL.createObjectURL(row.blob),
  }))
}

export async function removeMusicTrack(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_TRACKS, 'readwrite')
  tx.objectStore(STORE_TRACKS).delete(id)
  await txDone(tx)
  // 删除默认曲目时也打上 seeded，避免刷新后又写回来
  if (id === DEFAULT_MUSIC_TRACK_ID) markDefaultSeeded()
}

/** 仅清音乐库；与 deleteKulanChatDatabase 分离 */
export async function deleteKulanMusicDatabase(): Promise<void> {
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
    req.onerror = () => reject(req.error ?? new Error('KulanMusicDB delete failed'))
    req.onblocked = () => {
      window.setTimeout(() => resolve(), 400)
    }
  })
}
