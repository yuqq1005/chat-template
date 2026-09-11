import type { ModelOption } from '../config/modelProviders'

interface ModelsApiResponse {
  data?: Array<{ id?: string; object?: string; owned_by?: string }>
  error?: { message?: string }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

/** GET /models — OpenAI 兼容，用于探测 Key 与可用模型 */
export async function fetchRemoteModels(
  baseUrl: string,
  apiKey: string,
): Promise<ModelOption[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  let data: ModelsApiResponse = {}
  try {
    data = await response.json()
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`)
  }

  const list = (data.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id && typeof id === 'string'))
    .sort((a, b) => a.localeCompare(b))

  if (!list.length) {
    throw new Error('接口未返回任何模型，请确认 Base URL 与 Key 是否正确')
  }

  return list.map((id) => ({ id, label: id }))
}
