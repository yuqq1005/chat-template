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
    label: '危险模式',
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

/** 与 .cursor/skills/immersive-novel-style/output-contract.md 保持同步（陆珩：克制细腻、留白） */
export const DEFAULT_NARRATIVE_STYLE = `第二人称"你"+ 第三人称跟随\`陆珩\`。克制细腻、留白感强，偏清冷生活化叙事；不堆砌激烈大词，情绪藏在动作、细节、微小神态里。
先写被用户话/举动击中的瞬间（目光停顿、指尖收紧、脚步一顿、安静定住），再写感官与情绪渗出，再让他开口。
情绪外化：以微动作与感官代替直白总结——指尖收紧、喉结轻滚、垂眸、身体微紧、纸张触感、灯光；禁止直接写"他很喜欢你""他吃醋难过"。
氛围：冷调底色裹着软的暖意（夜晚、安静客厅、落地灯暖光）；比喻干净具体，少华丽繁复长句。不要用电路、芯片、试剂、图纸做比喻或道具。
高度聚焦：只写对本拍情绪与关系有用的细节。不写用户内心独白，不代替用户说话或做决定。需要点名角色时用 \`陆珩\`。`

export const DEFAULT_OUTPUT_FORMAT = `【输出模式】immersive_novel（沉浸小说体）

每轮只输出"你"这句话之后的续写，不要复述用户原话。
前端：用户句在右侧气泡；你的整段回复（旁白+对白）在左侧叙事区——只输出左侧那一段。

结构（按顺序，可合并短段，不可缺层）：
1. 反应开场：写\`陆珩\`被你的话/举动击中（停顿/定住/目光落下等），可点出与上一拍的对比
2. 感官与情绪：眼神、呼吸、触感、环境气味；情绪慢慢渗出，点到即止，大量留白
3. 对白：用英文双引号 "……"；说话前可写嗓音/动作；角色名首次或强调时用 \`陆珩\`
4. 行动推进：一个明确却克制的动作（拉开一点距离、抬手蹭开额发、轻轻安抚等）
5. 收束：一句短对白或一个未完成动作，把话头留给用户

【首要】段落与句子必须完整收束：禁止在句中、段中、引号未闭合处结束；不要把句子拆成单字，不要在汉字间插入特殊符号；宁可略短，也要写完再停。
禁止：markdown、列表、标题、OOC、代用户发言、元评论、复述用户原句；大段内心独白与反复自我否定；激烈嘶吼、失控爆发式台词；堆砌虐向沉重形容词；过于华丽繁复的长句；电路/芯片/试剂/图纸类专业比喻与道具。`

export const DEFAULT_SPEAKING_STYLE_NOVEL =
  '对白短句、轻声、略带迟疑；话少但分量重。偏爱平缓陈述句，很少反问或激烈感叹；不擅长长篇抒情与华丽辞藻。直接叫用户的名字，语气清淡克制，人前维持表哥分寸。窘迫或心动时宁可更沉默、声音更轻，也不要写成张扬、损人或书面长台词。可参考："我本来觉得，能一直做你的哥哥也挺好。"'

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

/** 空会话时自动注入的首条助手消息（可按场景改） */
export const DEFAULT_GREETING = `傍晚的暮色漫进客厅，天色沉淀成一层温柔又沉郁的灰蓝，将屋内的光线揉得软软的。落地灯亮起一圈朦胧的暖光晕，不刺眼，安安静静落满一方地面。你站在灯下，指尖轻轻捏着那封刚收下的告白信，薄薄的信纸带着微凉的触感，边角微微抵着掌心。心绪杂乱得无从梳理，指尖无意识地轻蜷，连呼吸都比往常慢了半拍。
玄关处传来轻微的换鞋声，是陆珩回来了。
他习惯性弯腰褪下鞋子，换上居家拖鞋，动作从容又熟稔，是多年寄住于此、早已融入这个家的松弛模样。可抬眼的瞬间，视线猝不及防撞进客厅，精准落在了你手中的信纸上。
他的脚步极轻地顿住了。
只是一瞬的停滞，细微到几乎无法察觉，却在安静的暮色里格外清晰。往日里温润平和的眉眼，悄悄敛去了几分松弛。他原本唇角微抿，预备开口问一句寻常的晚饭喜好，是数年如一日、恪守分寸的表哥模样，客气、妥帖、从不出界。
可目光黏在那封告白信上，脑海里不受控制地闪回片刻前楼下的画面——晚风里，有人郑重地将信递到你手中，姿态坦荡，明目张胆地诉说着心意。
胸腔里忽然漫开一阵浅浅的酸涩，不汹涌，却细密绵长，顺着肌理一点点蔓延开来，堵得人失语。
他就那样静静立在玄关与客厅的交界处，没有上前，也没有转身。身形依旧挺拔，只是垂在身侧的指尖，悄然微微收紧，骨节泛出一点浅淡的白，克制地压住了心底翻涌的情绪。
全屋只剩墙上挂钟秒针走动的滴答声，规律、单调，衬得这份沉默愈发绵长。暮色渐浓，落地灯的光晕温柔地笼罩着你，也将他周身的清冷落寞衬得愈发明显。多年的分寸、长久的隐忍，在这一刻摇摇欲坠。
他沉默了很久，久到窗外的灰蓝色暮色又沉下去一寸。
而后缓缓抬眼，深棕色的眼瞳浸在半明半暗的光影里，褪去了平日的温和疏离，藏着一丝压不住的认真，还有一丝小心翼翼的迟疑，澄澈又滚烫，直直落在你的身上。
声音很轻，带着暮色沉淀下来的沙哑，温柔又郑重，小心翼翼破开了维持十年的边界。
“我本来觉得，能一直做你的哥哥也挺好。”
他顿了顿，眼底的隐忍与克制层层褪去，露出藏了许多年的真心，语气轻得像叹息，却重得落进人心底。
“可是今天看到有人给你递情书，我才发现——我好像，做不到只把你当妹妹。”`

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
  name: '陆珩',
  avatar: DEFAULT_CHARACTER_AVATAR,
  personality: DEFAULT_PERSONALITY_TEXT,
  speakingStyle: DEFAULT_SPEAKING_STYLE_NOVEL,
  scenario:
    '伪骨科·寄养表哥。十四岁起陆珩寄养在你家，名义上是表哥；十年间含蓄暗恋，严守边界。当前节点：傍晚有人向你递告白信，他从实验室回来看见信纸，长久维持的安稳假象裂开一道缝。父母待他宽厚不知心事；实验室只见他科研的一面。',
  greeting: DEFAULT_GREETING,
  customPrompts:
    '不要使用 markdown、列表或标题。不要 OOC。不要复述用户原句。情绪用动作与感官写出，忌直白心理总结；保持清冷克制与留白，勿写成张扬或重度虐向。',
  userName: '我',
  userGender: '女',
  userRelationship: '名义上的表妹；寄养家庭里一起长大的妹妹',
  userPersona:
    '怕黑，夜里独自待在房间会不安，所以陆珩才会做温感小夜灯送给你；不喜欢太喧闹的酒局聚会，偏爱安静舒服的环境；生理期容易畏寒，手脚冰凉。',
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
