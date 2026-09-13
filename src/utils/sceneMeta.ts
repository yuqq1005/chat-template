/** 助手消息页眉：时间（客户端）+ 地点/人物/天气/评价（独立短调用） */

import type { MessageScene } from '../types'
import { AiCaller } from './aiCaller'
import type { CharacterCard, SceneHeaderSettings } from './characterStorage'
import { ConfigStorage } from './configStorage'

const MS_PER_MINUTE = 60_000
const MS_PER_YEAR = 365.25 * 24 * 60 * MS_PER_MINUTE

/** 最近 5 年内随机一个故事时间（ISO） */
export function randomStoryTimeIso(now = Date.now()): string {
  const offset = Math.floor(Math.random() * 5 * MS_PER_YEAR)
  return new Date(now - offset).toISOString()
}

/** 在上一拍基础上随机推进 1–5 分钟 */
export function advanceStoryTimeIso(prevIso: string): string {
  const prev = Date.parse(prevIso)
  const base = Number.isFinite(prev) ? prev : Date.now()
  const minutes = 1 + Math.floor(Math.random() * 5)
  return new Date(base + minutes * MS_PER_MINUTE).toISOString()
}

export function formatStoryTime(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day} ${h}:${mi}`
}

/** 是否需要另一次模型调用填写页眉软字段 */
export function needsSceneMetaModelCall(settings: SceneHeaderSettings): boolean {
  if (!settings.enabled) return false
  const f = settings.fields
  return f.location || f.people || f.weather || f.godComment
}

export interface SceneMetaFields {
  location?: string
  people?: string
  weather?: string
  godComment?: string
}

function tag(raw: string, name: string): string | undefined {
  const re = new RegExp(`<${name}>\\s*([\\s\\S]*?)\\s*</${name}>`, 'i')
  const m = raw.match(re)
  const v = m?.[1]?.trim()
  if (!v || v === '无' || v === '无。' || v === '-') return undefined
  return v
}

/** 解析强制结构 <scene_meta>…</scene_meta> */
export function parseSceneMetaXml(raw: string): SceneMetaFields {
  const block =
    raw.match(/<scene_meta>\s*([\s\S]*?)\s*<\/scene_meta>/i)?.[1] ?? raw
  return {
    location: tag(block, 'location'),
    people: tag(block, 'people'),
    weather: tag(block, 'weather'),
    godComment: tag(block, 'god_comment') ?? tag(block, 'godComment'),
  }
}

export function buildMessageScene(
  timeIso: string,
  fields: SceneMetaFields,
  settings: SceneHeaderSettings,
): MessageScene | undefined {
  if (!settings.enabled) return undefined

  const scene: MessageScene = { time: timeIso }
  if (settings.fields.location && fields.location) scene.location = fields.location
  if (settings.fields.people && fields.people) scene.people = fields.people
  if (settings.fields.weather && fields.weather) scene.weather = fields.weather
  if (settings.fields.godComment && fields.godComment) {
    scene.godComment = fields.godComment
  }

  if (
    settings.fields.time ||
    scene.location ||
    scene.people ||
    scene.weather ||
    scene.godComment
  ) {
    return scene
  }
  return { time: timeIso }
}

/** 开场白默认页眉（不调模型） */
export function createGreetingScene(characterName: string): MessageScene {
  return {
    time: randomStoryTimeIso(),
    location: '便利店门口',
    people: `${characterName || '贺之炀'}、你`,
    weather: '晚风微凉，路灯把柏油路照成浅黄',
    godComment: '确认关系后的第一秒，空气比合同还紧。',
  }
}

export function nextStoryTimeFromMessages(
  messages: Array<{ role: string; scene?: MessageScene }>,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.scene?.time) {
      return advanceStoryTimeIso(m.scene.time)
    }
  }
  return randomStoryTimeIso()
}

function buildSceneMetaSystemPrompt(settings: SceneHeaderSettings): string {
  const lines = [
    '你是场景页眉生成器。禁止输出思考过程。直接输出 XML，不要解释。',
    '必须完整闭合，且整段回复只能包含下面这一块：',
    '<scene_meta>',
  ]
  if (settings.fields.location) {
    lines.push('  <location>具体地点，短词或短语</location>')
  }
  if (settings.fields.people) {
    lines.push('  <people>现场人物，多人用顿号；无人写无</people>')
  }
  if (settings.fields.weather) {
    lines.push('  <weather>天气或环境氛围，一句话内</weather>')
  }
  if (settings.fields.godComment) {
    lines.push(
      '  <god_comment>10-30字，上帝视角，带暧昧感的吐槽或幽默，贴合当下</god_comment>',
    )
  }
  lines.push('</scene_meta>')
  lines.push('不要输出时间。不要 markdown。不要其它文字。')
  return lines.join('\n')
}

export interface FetchSceneMetaOptions {
  character: CharacterCard
  settings: SceneHeaderSettings
  /** 本轮故事时间（ISO），仅作氛围参考 */
  storyTimeIso: string
  userText: string
  /** 上一拍地点等，可空 */
  prevScene?: MessageScene
}

/**
 * 独立短调用生成页眉软字段。失败返回空对象（时间仍由客户端提供）。
 */
export async function fetchSceneMeta(
  options: FetchSceneMetaOptions,
): Promise<SceneMetaFields> {
  const { character, settings, storyTimeIso, userText, prevScene } = options
  if (!needsSceneMetaModelCall(settings)) return {}

  const cfg = ConfigStorage.getApiConfig()
  if (!cfg.apiKey?.trim()) return {}

  const caller = new AiCaller({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0.7,
    topP: 0.9,
    // 短 XML；预留余量，避免思考链占满后 content 为空
    maxTokens: 1024,
    // 页眉任务禁止思考：不依赖 provider 开关（自定义网关常为 false）
    disableThinking: true,
  })

  const name = character.name || '对方'
  const userBits = [
    `角色名：${name}`,
    character.scenario?.trim() && `场景前提：${character.scenario.trim()}`,
    `当前故事时间（仅参考氛围，勿输出时间）：${formatStoryTime(storyTimeIso)}`,
    prevScene?.location && `上一拍地点：${prevScene.location}`,
    prevScene?.people && `上一拍现场：${prevScene.people}`,
    prevScene?.weather && `上一拍氛围：${prevScene.weather}`,
    `用户刚说：${userText}`,
  ].filter(Boolean)

  try {
    const { content, finishReason } = await caller.chat([
      { role: 'system', content: buildSceneMetaSystemPrompt(settings) },
      { role: 'user', content: userBits.join('\n') },
    ])
    if (!content.trim()) {
      console.warn('[场景页眉] 模型返回空正文', { finishReason })
      return {}
    }
    const parsed = parseSceneMetaXml(content)
    if (!parsed.location && !parsed.people && !parsed.weather && !parsed.godComment) {
      console.warn('[场景页眉] 未能解析 <scene_meta>', content.slice(0, 200))
    }
    return parsed
  } catch (e) {
    console.warn('[场景页眉] 短调用失败，仅保留时间:', e)
    return {}
  }
}
