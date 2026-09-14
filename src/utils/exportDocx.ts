/** 导出角色 / 文风 / 聊天记录为 .docx */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import type { UiMessage } from '../types'
import type { CharacterCard, ReplyMode } from './characterStorage'
import type { MessageGameplay } from './gameplayMeta'
import { formatStoryTime } from './sceneMeta'

export interface ExportDocOptions {
  includeCharacter: boolean
  includeStyle: boolean
  includeChat: boolean
  character: CharacterCard
  messages: UiMessage[]
}

const MUTED = '6B6560'
const NOTE = '8A847C'
/** 旁白首行缩进二字符（OOXML：百分之一字符） */
const BODY_FIRST_LINE_CHARS = 200

function replyModeLabel(mode: ReplyMode): string {
  return mode === 'im_bubble' ? '对话（气泡）' : '旁白+玩法（沉浸小说体）'
}

function p(text: string, opts?: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] }): Paragraph {
  if (opts?.heading) {
    return new Paragraph({
      heading: opts.heading,
      children: [new TextRun({ text: text || ' ', break: 0 })],
    })
  }
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: text || ' ',
        bold: opts?.bold,
      }),
    ],
  })
}

function blank(): Paragraph {
  return new Paragraph({ children: [] })
}

function sectionTitle(title: string): Paragraph {
  return p(title, { heading: HeadingLevel.HEADING_1 })
}

function field(label: string, value: string | undefined | null): Paragraph[] {
  const v = (value ?? '').trim()
  if (!v) {
    return [p(`${label}：`, { bold: true }), p('（空）')]
  }
  const lines = v.split(/\r?\n/)
  return [
    p(`${label}：`, { bold: true }),
    ...lines.map((line) => p(line)),
  ]
}

/** 用户发言：「」+ 加粗，无背景高亮 */
function formatUserPlain(content: string): Paragraph[] {
  const body = content.trim() || '（空）'
  const lines = body.split(/\r?\n/)
  return lines.map((line, i) => {
    const isFirst = i === 0
    const isLast = i === lines.length - 1
    let text = line
    if (lines.length === 1) text = `「${line}」`
    else if (isFirst) text = `「${line}`
    else if (isLast) text = `${line}」`

    return new Paragraph({
      spacing: { before: isFirst ? 80 : 0, after: isLast ? 200 : 40 },
      children: [
        new TextRun({
          text: text || ' ',
          bold: true,
          size: 24,
        }),
      ],
    })
  })
}

/** 场景条：居中小字；评价单独淡斜体 */
function formatSceneNovel(msg: UiMessage): Paragraph[] {
  const scene = msg.scene
  if (!scene) return []

  const parts: string[] = []
  if (scene.time) parts.push(formatStoryTime(scene.time))
  if (scene.location?.trim()) parts.push(scene.location.trim())
  if (scene.people?.trim()) parts.push(scene.people.trim())
  if (scene.weather?.trim()) parts.push(scene.weather.trim())

  const out: Paragraph[] = []
  if (parts.length) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: parts.join(' · '),
            size: 18,
            color: MUTED,
          }),
        ],
      }),
    )
  }

  const comment = scene.godComment?.trim()
  if (comment) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: comment,
            italics: true,
            size: 16,
            color: NOTE,
          }),
        ],
      }),
    )
  } else if (parts.length) {
    out.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [],
      }),
    )
  }

  return out
}

function bodyParagraphs(content: string): Paragraph[] {
  const body = collapseBlankLines(content)
  if (!body) return [p('（空）')]
  return body.split(/\n/).map(
    (line) =>
      new Paragraph({
        spacing: { after: 140 },
        indent: { firstLineChars: BODY_FIRST_LINE_CHARS },
        children: [new TextRun({ text: line || ' ', size: 22 })],
      }),
  )
}

function joinParts(pairs: Array<[string, string | undefined]>, sep = '｜'): string | null {
  const bits = pairs
    .map(([k, v]) => {
      const t = v?.trim()
      return t ? `${k} · ${t}` : null
    })
    .filter(Boolean) as string[]
  return bits.length ? bits.join(sep) : null
}

function noteTitle(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text: `〔${title}〕`,
        size: 16,
        color: MUTED,
        bold: true,
      }),
    ],
  })
}

function noteLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 120 },
    children: [
      new TextRun({
        text,
        size: 16,
        color: NOTE,
      }),
    ],
  })
}

/** 玩法：正文后小附注；空字段不写 */
function formatGameplayNotes(gp: MessageGameplay): Paragraph[] {
  const out: Paragraph[] = []

  if (gp.status) {
    const row1 = joinParts([
      ['穿搭', gp.status.outfit],
      ['动作', gp.status.action],
      ['心情', gp.status.mood],
    ])
    const os = gp.status.innerOs?.trim()
    const row2 = joinParts([
      ['好感', gp.status.affection],
      ['关于你', gp.status.aboutYou],
    ])
    if (row1 || os || row2) {
      out.push(noteTitle('状态'))
      if (row1) out.push(noteLine(row1))
      if (os) out.push(noteLine(`内心OS｜${os}`))
      if (row2) out.push(noteLine(row2))
    }
  }

  if (gp.phone) {
    const lines = [
      joinParts([['通知', gp.phone.notices]]),
      joinParts([['便签', gp.phone.notes]]),
      joinParts([['搜索记录', gp.phone.searches]]),
    ].filter(Boolean) as string[]
    if (lines.length) {
      out.push(noteTitle('手机'))
      lines.forEach((l) => out.push(noteLine(l)))
    }
  }

  if (gp.social) {
    const lines = [
      joinParts([['群聊', gp.social.groupChat]]),
      joinParts([['私信', gp.social.dm]]),
    ].filter(Boolean) as string[]
    if (lines.length) {
      out.push(noteTitle('社交圈'))
      lines.forEach((l) => out.push(noteLine(l)))
    }
  }

  if (gp.promises) {
    const lines = [
      joinParts([['待完成', gp.promises.pending]]),
      joinParts([['已完成', gp.promises.done]]),
    ].filter(Boolean) as string[]
    if (lines.length) {
      out.push(noteTitle('约定'))
      lines.forEach((l) => out.push(noteLine(l)))
    }
  }

  return out
}

function formatAssistantBlock(msg: UiMessage): Paragraph[] {
  return [
    ...formatSceneNovel(msg),
    ...bodyParagraphs(msg.content || ''),
    ...(msg.gameplay ? formatGameplayNotes(msg.gameplay) : []),
  ]
}

/** 展示/导出：去掉段间空行，保留单行换行 */
function collapseBlankLines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').trim()
}

function buildCharacterSection(card: CharacterCard): Paragraph[] {
  return [
    sectionTitle('角色'),
    ...field('姓名', card.name),
    blank(),
    ...field('人设', card.personality),
    blank(),
    ...field('场景', card.scenario),
    blank(),
    ...field('开场白', card.greeting),
    blank(),
    p('用户侧', { bold: true }),
    ...field('名字', card.userName),
    ...field('性别', card.userGender),
    ...field('关系', card.userRelationship),
    ...field('人设', card.userPersona),
    blank(),
  ]
}

function buildStyleSection(card: CharacterCard): Paragraph[] {
  return [
    sectionTitle('文风'),
    ...field('回复模式', replyModeLabel(card.replyMode)),
    blank(),
    ...field('对白腔', card.speakingStyle),
    blank(),
    ...field('旁白', card.narrativeStyle),
    blank(),
    ...field('输出格式', card.outputFormat),
    blank(),
    ...field('额外指令', card.customPrompts),
    blank(),
  ]
}

function buildChatSection(messages: UiMessage[]): Paragraph[] {
  const paras: Paragraph[] = [sectionTitle('聊天记录')]
  const durable = messages.filter((m) => !m.pending && (m.role === 'user' || m.role === 'assistant'))

  if (!durable.length) {
    paras.push(p('（暂无消息）'))
    return paras
  }

  for (const msg of durable) {
    if (msg.role === 'user') {
      paras.push(...formatUserPlain(msg.content || ''))
    } else {
      paras.push(...formatAssistantBlock(msg))
      paras.push(blank())
    }
  }

  return paras
}

export async function buildExportDocxBlob(options: ExportDocOptions): Promise<Blob> {
  const { includeCharacter, includeStyle, includeChat, character, messages } = options
  if (!includeCharacter && !includeStyle && !includeChat) {
    throw new Error('请至少选择一项导出内容')
  }

  const children: Paragraph[] = [
    p('Chat 导出', { heading: HeadingLevel.TITLE }),
    p(`导出时间：${new Date().toLocaleString('zh-CN')}`),
    blank(),
  ]

  if (includeCharacter) children.push(...buildCharacterSection(character))
  if (includeStyle) children.push(...buildStyleSection(character))
  if (includeChat) children.push(...buildChatSection(messages))

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function buildExportFilename(opts: {
  includeCharacter: boolean
  includeStyle: boolean
  includeChat: boolean
  characterName: string
}): string {
  const parts: string[] = []
  if (opts.includeCharacter) parts.push('角色')
  if (opts.includeStyle) parts.push('文风')
  if (opts.includeChat) parts.push('聊天')
  const name = (opts.characterName || 'export').replace(/[\\/:*?"<>|]/g, '_').slice(0, 24)
  const stamp = new Date().toISOString().slice(0, 10)
  return `${name}_${parts.join('+') || 'export'}_${stamp}.docx`
}
