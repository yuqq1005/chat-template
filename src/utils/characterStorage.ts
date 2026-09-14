/** 角色卡 + 文风（静态设定，非长期记忆事实） */

import defaultPeerAvatar from '../assets/boyfriend.jpg'
import defaultUserAvatar from '../assets/default.jpg'
import { DEFAULT_PERSONALITY_TEXT, normalizePersonalityStorage } from './personalityParts'

export const DEFAULT_USER_AVATAR = defaultUserAvatar

/** 角色默认头像（与聊天背景同源图） */
export const DEFAULT_CHARACTER_AVATAR = defaultPeerAvatar

/** 回复呈现 / 主模型输出形态 */
export type ReplyMode = 'im_bubble' | 'immersive_novel'

export const REPLY_MODE_OPTIONS: Array<{ value: ReplyMode; label: string; hint: string }> = [
  {
    value: 'im_bubble',
    label: '对话',
    hint: '短句对白，双边气泡',
  },
  {
    value: 'immersive_novel',
    label: '旁白+玩法',
    hint: '右气泡 · 左旁白+对白',
  },
]

export const FRESH_MODE_OPTIONS: Array<{ value: boolean; label: string; hint: string }> = [
  {
    value: false,
    label: '普通模式',
    hint: '按原文发送',
  },
  {
    value: true,
    label: '新鲜模式',
    hint: '发送时在句末附加固定提示词',
  },
]

/** 副模型后台记忆整理引擎 */
export const MEMORY_ENGINE_OPTIONS: Array<{ value: boolean; label: string; hint: string }> = [
  {
    value: true,
    label: '开启',
    hint: '聊完一轮自动抽取事实',
  },
  {
    value: false,
    label: '关闭',
    hint: '不调用副模型整理记忆',
  },
]

/** 助手正文前的场景页眉（时间 / 地点等） */
export const SCENE_HEADER_OPTIONS: Array<{ value: boolean; label: string; hint: string }> = [
  {
    value: true,
    label: '开启',
    hint: '回复前显示时间地点等页眉',
  },
  {
    value: false,
    label: '关闭',
    hint: '不显示、不请求页眉字段',
  },
]

/** 与 .cursor/skills/immersive-novel-style/output-contract.md 保持同步 */
export const DEFAULT_NARRATIVE_STYLE = `第二人称"你"+ 第三人称跟随角色。先写被用户话击中的瞬间（定住、宕机、僵住、暂停键），再写感官与情绪转化，再让角色开口。
情绪外化：以微表情与生理反应（耳根发热、喉头一紧、睫毛一颤、掌心温度）代替"他很窘"这类直接总结。
比喻要具体可感（暂停键、冷水、猫爪、羽毛、砂纸），少堆空泛形容词；环境可用晚风、路灯、花草气味作淡背景。
高度聚焦：只写对本拍情绪与关系有用的细节，避免无关铺陈。
不写用户内心独白，不代替用户说话或做决定。需要点名角色时用 \`角色名\`。`

export const DEFAULT_OUTPUT_FORMAT = `【输出模式】immersive_novel（沉浸小说体）

每轮只输出"你"这句话之后的续写，不要复述用户原话。
前端：用户句在右侧气泡；你的整段回复（旁白+对白）在左侧叙事区——只输出左侧那一段。

结构（按顺序，可合并短段，不可缺层）：
1. 反应开场：写角色被你的话击中（定住/宕机/僵住等），可点出与上一拍的对比
2. 感官与情绪：眼神、呼吸、触感、环境；情绪要有转化（错愕→无奈、侵略→窘迫）
3. 对白：用英文双引号 "……"；说话前可写嗓音/动作；角色名首次或强调时用 \`角色名\`
4. 行动推进：一个明确动作（松手、捧脸、拉开距离、低头等）
5. 收束：一句对白或一个未完成动作，把话头留给用户

【首要】段落与句子必须完整收束：禁止在句中、段中、引号未闭合处结束；不要把句子拆成单字，不要在汉字间插入特殊符号；宁可略短，也要写完再停。
禁止：markdown、列表、标题、OOC、代用户发言、元评论、复述用户原句。`

export const DEFAULT_SPEAKING_STYLE_NOVEL =
  '对白短句、口语；偶尔损人但不恶毒；窘迫时会卡壳（"我……"）；称用户"老板"；沿用"投资品 / 服务费 / 收费"等场景隐喻。语气可从张扬转到闷、认输、小声嘀咕；不要写成书面长台词。'

export const DEFAULT_SPEAKING_STYLE_BUBBLE =
  '短句、口语、偶尔损人；少用书面语和长段落；生气时更短更冲；像即时通讯气泡，一行一句。'

/** 场景页眉各字段是否展示（后台可关） */
export interface SceneHeaderFields {
  time: boolean
  location: boolean
  people: boolean
  weather: boolean
  godComment: boolean
}

/** 助手正文前的时间/地点等页眉 */
export interface SceneHeaderSettings {
  enabled: boolean
  fields: SceneHeaderFields
}

export const DEFAULT_SCENE_HEADER_FIELDS: SceneHeaderFields = {
  time: true,
  location: true,
  people: true,
  weather: true,
  godComment: true,
}

export const DEFAULT_SCENE_HEADER: SceneHeaderSettings = {
  enabled: true,
  fields: { ...DEFAULT_SCENE_HEADER_FIELDS },
}

export function normalizeSceneHeader(
  partial: Partial<SceneHeaderSettings> | null | undefined,
): SceneHeaderSettings {
  const fieldsIn = partial?.fields
  return {
    enabled: partial?.enabled !== false,
    fields: {
      time: fieldsIn?.time !== false,
      location: fieldsIn?.location !== false,
      people: fieldsIn?.people !== false,
      weather: fieldsIn?.weather !== false,
      godComment: fieldsIn?.godComment !== false,
    },
  }
}

/** 空会话时自动注入的首条助手消息（约 400 字，可按场景改） */
export const DEFAULT_GREETING = `便利店门口的灯还亮着，把柏油路面照出一小块浅黄。确认关系这件事刚落定，空气却比刚才更安静了些，像两个人都还没想好"下一步"该怎么写进合同条款。

\`贺之炀\`站在你身侧半步，银白色短发被晚风掀起一点碎边。他原本那副张扬的气焰还挂在眉梢，可一转头对上你的视线，那点锋芒就莫名其妙地软了半寸——像投资品突然意识到，老板已经在场，得把姿态摆正。路边花坛里飘来一点淡淡的草腥气，混着便利店里飘出的冷气，衬得他耳根那点热意格外明显。

他低头看了眼自己空着的手，拇指在裤缝旁无意识地蹭了蹭，又抬眼看你，喉结轻轻滚了一下，才用那种故意轻松、却藏着小心翼翼的语气开口：

"……老板，现在算是正式开工了？"他顿了顿，声音还硬撑着，"投资品待命中。服务费的事……你要是现在就想谈细则，我也——不是，我的意思是，你先说。你想去哪儿，或者……先站这儿也行。"

他把球轻轻推回给你，目光却没挪开，像在等你这句"老板指令"——也像在等你，先对他笑一下。`

export interface CharacterCard {
  name: string
  /** 角色头像：https URL、打包资源路径或 data URL（不持久化 blob:） */
  avatar: string
  /** 角色人设 / 背景 */
  personality: string
  /** 对白腔：怎么说话（不写篇幅/结构） */
  speakingStyle: string
  /** 场景 / 关系前提 */
  scenario: string
  /** 开场白预设：空会话时作为首条助手消息展示（可改；空则不注入） */
  greeting: string
  /** 额外行为指令 */
  customPrompts: string
  /** 用户侧称呼（对方怎么叫你 / 你的名字） */
  userName: string
  /** 用户性别（注入主模型，对齐 freeapp userProfile 扩展） */
  userGender: string
  /** 与角色的关系 */
  userRelationship: string
  /** 用户人设 / 性格（对齐 freeapp userProfile.personality） */
  userPersona: string
  /** 用户头像：https URL 或 data URL（不持久化 blob:） */
  userAvatar: string
  /** 回复模式：气泡 IM vs 沉浸小说体 */
  replyMode: ReplyMode
  /** 旁白文风（immersive_novel 时注入） */
  narrativeStyle: string
  /** 输出结构契约（immersive_novel 时注入） */
  outputFormat: string
  /**
   * 新鲜模式：为 true 时，每次请求在用户原文后追加
   * `import.meta.env.VITE_FRESH_APPEND_PROMPT`（见 react-chat/.env）
   */
  freshMode: boolean
  /** 后台记忆整理引擎：为 false 时跳过副模型 memory_ops */
  memoryEngineEnabled: boolean
  /** 助手正文前的场景页眉（时间/地点等）显示开关 */
  sceneHeader: SceneHeaderSettings
}

export const DEFAULT_CHARACTER: CharacterCard = {
  name: '贺之炀',
  avatar: DEFAULT_CHARACTER_AVATAR,
  personality: DEFAULT_PERSONALITY_TEXT,
  speakingStyle: DEFAULT_SPEAKING_STYLE_NOVEL,
  scenario: '便利店门口确认关系后的日常私聊。亲吻被约定为"服务费"。',
  greeting: DEFAULT_GREETING,
  customPrompts: '不要使用 markdown、列表或标题。不要 OOC。不要复述用户原句。',
  userName: '我',
  userGender: '女',
  userRelationship: '暧昧；对方称我"老板"，自称"投资品"',
  userPersona: '随和、不讲究；偶尔逗弄对方，不轻易表态，话少但会接话。',
  userAvatar: DEFAULT_USER_AVATAR,
  replyMode: 'immersive_novel',
  narrativeStyle: DEFAULT_NARRATIVE_STYLE,
  outputFormat: DEFAULT_OUTPUT_FORMAT,
  freshMode: false,
  memoryEngineEnabled: true,
  sceneHeader: { ...DEFAULT_SCENE_HEADER, fields: { ...DEFAULT_SCENE_HEADER_FIELDS } },
}

const STORAGE_KEY = 'kulan.chat.character'

function sanitizeUserAvatar(url: string | undefined | null): string {
  if (!url || url.startsWith('blob:')) return DEFAULT_USER_AVATAR
  return url
}

function sanitizeCharacterAvatar(url: string | undefined | null): string {
  if (!url || url.startsWith('blob:')) return DEFAULT_CHARACTER_AVATAR
  return url
}

/** 去掉 outputFormat 里旧的「篇幅：…」及元说明行，改由配置注入 */
export function stripOutputFormatLengthLines(raw: string): string {
  return raw
    .replace(/^篇幅[：:].*$/gm, '')
    .replace(/^篇幅指引.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 把旧版长度/硬性字数指引迁到当前契约（并去掉写死区间，改走配置） */
function migrateOutputFormatLength(raw: string): string {
  let next = raw
    .replace(
      /约\s*200\s*[–—\-]\s*450\s*汉字[；;]?\s*2\s*[–—\-]\s*5\s*个自然段/g,
      '',
    )
    .replace(
      /约\s*400\s*[–—\-]\s*800\s*汉字[；;]?\s*3\s*[–—\-]\s*7\s*个自然段/g,
      '',
    )
    .replace(
      /正文不少于约\s*550\s*汉字，目标\s*600[–—\-]\s*1000\s*汉字[；;]?\s*4\s*[–—\-]\s*8\s*个自然段/g,
      '',
    )
    .replace(
      /长度硬性要求：正文不少于约\s*550\s*汉字，目标\s*600[–—\-]\s*1000\s*汉字/g,
      '',
    )
    .replace(/篇幅：约\s*400[–—\-]\s*800\s*汉字为佳，可弹性伸缩。?/g, '')
    .replace(/篇幅：约\s*400[–—\-]\s*700\s*字为宜，可弹性伸缩。?/g, '')
    .replace(/【首要】必须完整输出每个自然段[\s\S]*?完整收束后再停。\n?/g, '')
    .replace(/未写满最低字数前不要结束。?/g, '')
  return stripOutputFormatLengthLines(next)
}

export function buildOutputLengthHint(charsMin: number, charsMax: number): string {
  return `篇幅：约 ${charsMin}–${charsMax} 字为宜，可弹性伸缩。完整收束优先于凑字数。`
}

export interface BuildSystemPromptOptions {
  /** 主剧情目标中文字数区间（来自 AppConfig） */
  outputCharsMin?: number
  outputCharsMax?: number
}

export function normalizeReplyMode(value: unknown): ReplyMode {
  return value === 'im_bubble' ? 'im_bubble' : 'immersive_novel'
}

const BUBBLE_CUSTOM_PROMPTS =
  '不要使用 markdown。不要写旁白作文。回复拆成多条短气泡更佳。'

/** 切换回复模式；仅在字段仍是另一模式默认值时顺带改文案，避免覆盖用户自定义 */
export function withReplyMode(card: CharacterCard, replyMode: ReplyMode): CharacterCard {
  const next: CharacterCard = { ...card, replyMode: normalizeReplyMode(replyMode) }
  if (next.replyMode === 'immersive_novel') {
    if (!card.speakingStyle.trim() || card.speakingStyle === DEFAULT_SPEAKING_STYLE_BUBBLE) {
      next.speakingStyle = DEFAULT_SPEAKING_STYLE_NOVEL
    }
    if (!card.narrativeStyle.trim()) next.narrativeStyle = DEFAULT_NARRATIVE_STYLE
    if (!card.outputFormat.trim()) next.outputFormat = DEFAULT_OUTPUT_FORMAT
    if (card.customPrompts === BUBBLE_CUSTOM_PROMPTS) {
      next.customPrompts = DEFAULT_CHARACTER.customPrompts
    }
  } else if (!card.speakingStyle.trim() || card.speakingStyle === DEFAULT_SPEAKING_STYLE_NOVEL) {
    next.speakingStyle = DEFAULT_SPEAKING_STYLE_BUBBLE
    if (card.customPrompts === DEFAULT_CHARACTER.customPrompts) {
      next.customPrompts = BUBBLE_CUSTOM_PROMPTS
    }
  }
  return next
}

function normalizeCard(partial: Partial<CharacterCard> | null | undefined): CharacterCard {
  const merged: CharacterCard = {
    ...DEFAULT_CHARACTER,
    ...partial,
    avatar: sanitizeCharacterAvatar(partial?.avatar ?? DEFAULT_CHARACTER_AVATAR),
    userAvatar: sanitizeUserAvatar(partial?.userAvatar ?? DEFAULT_USER_AVATAR),
    personality: normalizePersonalityStorage(
      typeof partial?.personality === 'string'
        ? partial.personality
        : DEFAULT_CHARACTER.personality,
    ),
    replyMode: normalizeReplyMode(partial?.replyMode ?? DEFAULT_CHARACTER.replyMode),
    narrativeStyle:
      typeof partial?.narrativeStyle === 'string'
        ? partial.narrativeStyle
        : DEFAULT_CHARACTER.narrativeStyle,
    outputFormat: migrateOutputFormatLength(
      typeof partial?.outputFormat === 'string'
        ? partial.outputFormat
        : DEFAULT_CHARACTER.outputFormat,
    ),
    speakingStyle:
      typeof partial?.speakingStyle === 'string'
        ? partial.speakingStyle
        : DEFAULT_CHARACTER.speakingStyle,
    scenario:
      typeof partial?.scenario === 'string' ? partial.scenario : DEFAULT_CHARACTER.scenario,
    greeting:
      partial != null && Object.prototype.hasOwnProperty.call(partial, 'greeting')
        ? typeof partial.greeting === 'string'
          ? partial.greeting
          : DEFAULT_CHARACTER.greeting
        : DEFAULT_CHARACTER.greeting,
    freshMode: Boolean(partial?.freshMode),
    userName:
      typeof partial?.userName === 'string' && partial.userName.trim()
        ? partial.userName.trim()
        : DEFAULT_CHARACTER.userName,
    userGender:
      typeof partial?.userGender === 'string' && partial.userGender.trim()
        ? partial.userGender.trim()
        : DEFAULT_CHARACTER.userGender,
    userRelationship:
      typeof partial?.userRelationship === 'string' && partial.userRelationship.trim()
        ? partial.userRelationship.trim()
        : DEFAULT_CHARACTER.userRelationship,
    userPersona:
      typeof partial?.userPersona === 'string' && partial.userPersona.trim()
        ? partial.userPersona.trim()
        : DEFAULT_CHARACTER.userPersona,
    // 旧存档无此字段时默认开启，保持原行为
    memoryEngineEnabled:
      partial != null && Object.prototype.hasOwnProperty.call(partial, 'memoryEngineEnabled')
        ? Boolean(partial.memoryEngineEnabled)
        : true,
    sceneHeader: normalizeSceneHeader(partial?.sceneHeader),
  }
  return merged
}

export function loadCharacter(): CharacterCard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CHARACTER }
    const parsed = JSON.parse(raw) as Partial<CharacterCard>
    // 旧存档无 replyMode → 保持气泡行为，避免升级后突然切小说体
    const legacyNoMode = !Object.prototype.hasOwnProperty.call(parsed, 'replyMode')
    return normalizeCard({
      ...parsed,
      replyMode: legacyNoMode ? 'im_bubble' : parsed.replyMode,
    })
  } catch {
    return { ...DEFAULT_CHARACTER }
  }
}

export function saveCharacter(card: CharacterCard): void {
  const toStore = normalizeCard(card)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
}

/** 将本地图片压成较小的 data URL，便于写入 localStorage */
export function fileToAvatarDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.onload = () => {
      const src = String(reader.result || '')
      const img = new Image()
      img.onerror = () => reject(new Error('图片无法解析'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

/** 对齐 freeapp：用户名 + 人设注入主模型（并扩展性别 / 关系） */
export function buildUserProfilePromptBlock(card: CharacterCard): string {
  const name = card.userName?.trim() || '我'
  const lines: string[] = [`用户的名字是"${name}"。`]
  if (card.userGender?.trim()) lines.push(`用户性别：${card.userGender.trim()}。`)
  if (card.userRelationship?.trim()) {
    lines.push(`与你（角色）的关系：${card.userRelationship.trim()}。`)
  }
  if (card.userPersona?.trim()) {
    lines.push(`用户的人设是：${card.userPersona.trim()}。`)
  }
  return `【用户设定】\n${lines.join('')}`
}

/** 拼进主模型的 system 消息（小说模式仍用单条为主，不强行拆成 own 那种多段） */
export function buildCharacterSystemMessages(
  card: CharacterCard,
  options?: BuildSystemPromptOptions,
): Array<{ role: 'system'; content: string }> {
  const mode = normalizeReplyMode(card.replyMode)
  const name = card.name || '对方'
  const userBlock = buildUserProfilePromptBlock(card)
  const charsMin = options?.outputCharsMin ?? 400
  const charsMax = options?.outputCharsMax ?? 700
  const lengthHint = buildOutputLengthHint(charsMin, charsMax)

  if (mode === 'immersive_novel') {
    const formatBody = stripOutputFormatLengthLines(card.outputFormat.trim())
    const parts = [
      `你正在进行第二人称沉浸式角色扮演。你是"${name}"。`,
      card.personality.trim() && `【角色设定】\n${card.personality.trim()}`,
      card.scenario.trim() && `【场景】\n${card.scenario.trim()}`,
      userBlock,
      card.narrativeStyle.trim() && `【旁白文风】\n${card.narrativeStyle.trim()}`,
      card.speakingStyle.trim() && `【对白腔】\n${card.speakingStyle.trim()}`,
      formatBody && `【输出格式】\n${formatBody}`,
      `【篇幅】\n${lengthHint}`,
      card.customPrompts.trim() && `【额外指令】\n${card.customPrompts.trim()}`,
      '前端会把用户消息显示在右侧气泡，你的整段回复（旁白+对白）显示在左侧叙事区；请只输出左侧那一整段，不要复述用户原话。',
    ].filter(Boolean)

    return [{ role: 'system', content: parts.join('\n\n') }]
  }

  const bubbleParts = [
    `你正在进行角色扮演私聊。你是"${name}"。`,
    card.personality.trim() && `【角色设定】\n${card.personality.trim()}`,
    card.speakingStyle.trim() && `【文风】\n${card.speakingStyle.trim()}`,
    card.scenario.trim() && `【场景】\n${card.scenario.trim()}`,
    userBlock,
    card.customPrompts.trim() && `【额外指令】\n${card.customPrompts.trim()}`,
    `用自然口语短句回复，像即时通讯气泡；单轮合计约 ${charsMin}–${charsMax} 字为宜，不要长篇大论，不要使用 markdown。`,
  ].filter(Boolean)

  return [{ role: 'system', content: bubbleParts.join('\n\n') }]
}

/** 兼容旧调用：拼成单条 system 文本 */
export function buildCharacterSystemPrompt(
  card: CharacterCard,
  options?: BuildSystemPromptOptions,
): string {
  return buildCharacterSystemMessages(card, options)
    .map((m) => m.content)
    .join('\n\n')
}

/** 新鲜模式附加提示词：只读自 .env 的 VITE_FRESH_APPEND_PROMPT */
export function getFreshAppendPrompt(): string {
  return String(import.meta.env.VITE_FRESH_APPEND_PROMPT ?? '').trim()
}

/**
 * 发给主模型的用户内容：新鲜模式开启且 .env 有提示词时，在原文后追加。
 * UI 气泡请仍使用原文。
 */
export function buildUserContentForApi(userText: string, card: CharacterCard): string {
  if (!card.freshMode) return userText
  const prompt = getFreshAppendPrompt()
  if (!prompt) return userText
  return `${userText}\n\n${prompt}`
}
