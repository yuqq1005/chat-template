/** 玩法二次调用：剧情完成后串行生成四栏数据 */

import { AiCaller } from './aiCaller'
import type { CharacterCard } from './characterStorage'
import { ConfigStorage } from './configStorage'
import {
  enabledGameplayPanels,
  type GameplayPanelId,
  type GameplaySettings,
} from './gameplayStorage'

/** 状态面板（中文字段） */
export interface GameplayStatusData {
  outfit?: string
  action?: string
  mood?: string
  innerOs?: string
  affection?: string
  aboutYou?: string
}

export interface GameplayPhoneData {
  notices?: string
  notes?: string
  searches?: string
}

export interface GameplaySocialData {
  groupChat?: string
  dm?: string
}

export interface GameplayPromisesData {
  pending?: string
  done?: string
}

export interface MessageGameplay {
  status?: GameplayStatusData
  phone?: GameplayPhoneData
  social?: GameplaySocialData
  promises?: GameplayPromisesData
}

function tag(raw: string, name: string): string | undefined {
  const re = new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, 'i')
  const m = raw.match(re)
  const v = m?.[1]?.trim()
  if (!v || v === '无' || v === '无。' || v === '-') return undefined
  return v
}

function section(raw: string, name: string): string {
  const re = new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, 'i')
  return raw.match(re)?.[1] ?? ''
}

export function parseGameplayXml(
  raw: string,
  enabled: GameplayPanelId[],
): MessageGameplay {
  const block = raw.match(/<gameplay>\s*([\s\S]*?)\s*<\/gameplay>/i)?.[1] ?? raw
  const out: MessageGameplay = {}
  const set = new Set(enabled)

  if (set.has('status')) {
    const s = section(block, 'status')
    out.status = {
      outfit: tag(s, 'outfit') ?? tag(s, '穿搭'),
      action: tag(s, 'action') ?? tag(s, '动作'),
      mood: tag(s, 'mood') ?? tag(s, '心情'),
      innerOs: tag(s, 'inner_os') ?? tag(s, '内心OS') ?? tag(s, 'os'),
      affection: tag(s, 'affection') ?? tag(s, '好感'),
      aboutYou: tag(s, 'about_you') ?? tag(s, '关于你'),
    }
  }
  if (set.has('phone')) {
    const s = section(block, 'phone')
    out.phone = {
      notices: tag(s, 'notices') ?? tag(s, '通知'),
      notes: tag(s, 'notes') ?? tag(s, '便签'),
      searches: tag(s, 'searches') ?? tag(s, '搜索记录'),
    }
  }
  if (set.has('social')) {
    const s = section(block, 'social')
    out.social = {
      groupChat: tag(s, 'group_chat') ?? tag(s, '群聊'),
      dm: tag(s, 'dm') ?? tag(s, '私信'),
    }
  }
  if (set.has('promises')) {
    const s = section(block, 'promises')
    out.promises = {
      pending: tag(s, 'pending') ?? tag(s, '待完成'),
      done: tag(s, 'done') ?? tag(s, '已完成'),
    }
  }
  return out
}

function buildGameplaySystemPrompt(enabled: GameplayPanelId[]): string {
  const lines = [
    '你是角色扮演「玩法面板」生成器。禁止输出思考过程。直接输出 XML，不要解释。',
    '根据本轮用户发言与角色剧情续写，生成贴合当下的侧写数据。',
    '必须完整闭合，且整段回复只能包含下面这一块：',
    '<gameplay>',
  ]

  if (enabled.includes('status')) {
    lines.push(
      '  <status>',
      '    <outfit>角色当前穿搭，一两句</outfit>',
      '    <action>此刻动作/姿态，一两句</action>',
      '    <mood>心情；可带简短颜文字</mood>',
      '    <inner_os>第一人称内心 OS，一两句</inner_os>',
      '    <affection>好感描述，如 12% 或 65→68[+3] 及一句理由</affection>',
      '    <about_you>角色此刻对用户的看法，一两句</about_you>',
      '  </status>',
    )
  }
  if (enabled.includes('phone')) {
    lines.push(
      '  <phone>',
      '    <notices>手机通知，可多行；如[微信]… / [天气]…</notices>',
      '    <notes>便签待办，可多行</notes>',
      '    <searches>搜索记录，每行：关键词（括号短评）</searches>',
      '  </phone>',
    )
  }
  if (enabled.includes('social')) {
    lines.push(
      '  <social>',
      '    <group_chat>好友群聊摘录，多行「昵称：内容」；角色可有一句简短回复</group_chat>',
      '    <dm>可选私信一两行；没有则写无</dm>',
      '  </social>',
    )
  }
  if (enabled.includes('promises')) {
    lines.push(
      '  <promises>',
      '    <pending>待完成的约定；没有写无</pending>',
      '    <done>已完成的承诺；没有写无</done>',
      '  </promises>',
    )
  }

  lines.push('</gameplay>')
  lines.push('不要 markdown。不要输出未启用的面板标签。不要其它文字。')
  return lines.join('\n')
}

export interface FetchGameplayOptions {
  character: CharacterCard
  settings: GameplaySettings
  userText: string
  narrative: string
}

/**
 * 剧情完成后的串行短调用。未启用任何栏或失败时返回 null。
 */
export async function fetchGameplay(
  options: FetchGameplayOptions,
): Promise<MessageGameplay | null> {
  const enabled = enabledGameplayPanels(options.settings)
  if (!enabled.length) return null

  const cfg = ConfigStorage.getApiConfig()
  if (!cfg.apiKey?.trim()) return null

  const caller = new AiCaller({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0.75,
    topP: 0.9,
    maxTokens: 2048,
    disableThinking: true,
  })

  const name = options.character.name || '对方'
  const userBits = [
    `角色名：${name}`,
    options.character.scenario?.trim() && `场景前提：${options.character.scenario.trim()}`,
    `用户刚说：${options.userText}`,
    '【本轮剧情正文】',
    options.narrative.slice(0, 3500),
  ].filter(Boolean)

  try {
    const { content, finishReason } = await caller.chat([
      { role: 'system', content: buildGameplaySystemPrompt(enabled) },
      { role: 'user', content: userBits.join('\n') },
    ])
    if (!content.trim()) {
      console.warn('[玩法] 模型返回空正文', { finishReason })
      return null
    }
    const parsed = parseGameplayXml(content, enabled)
    const hasAny =
      (parsed.status && Object.values(parsed.status).some(Boolean)) ||
      (parsed.phone && Object.values(parsed.phone).some(Boolean)) ||
      (parsed.social && Object.values(parsed.social).some(Boolean)) ||
      (parsed.promises && Object.values(parsed.promises).some(Boolean))
    if (!hasAny) {
      console.warn('[玩法] 未能解析 <gameplay>', content.slice(0, 240))
      return null
    }
    return parsed
  } catch (e) {
    console.warn('[玩法] 二次调用失败:', e)
    return null
  }
}

export function panelHasContent(
  gameplay: MessageGameplay | undefined,
  id: GameplayPanelId,
): boolean {
  if (!gameplay) return false
  const block = gameplay[id]
  if (!block) return false
  return Object.values(block).some((v) => typeof v === 'string' && v.trim())
}
