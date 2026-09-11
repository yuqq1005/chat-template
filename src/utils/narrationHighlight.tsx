import type { ReactNode } from 'react'

/** 匹配中文弯引号 / 直角引号 / 英文双引号内的对白（含引号本身） */
const DIALOGUE_RE =
  /([“][^”]*[”]|[「][^」]*[」]|[『][^』]*[』]|"[^"\n]*")/g

/**
 * 将旁白正文拆成普通文本 + 引号对白，供高亮渲染。
 * 未闭合的引号在流式输出中先当普通文本。
 */
export function renderNarrationWithDialogueHighlight(text: string): ReactNode[] {
  if (!text) return []

  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  const re = new RegExp(DIALOGUE_RE.source, 'g')

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <span key={`n-${last}`} className="text-white">
          {text.slice(last, match.index)}
        </span>,
      )
    }
    nodes.push(
      <mark
        key={`d-${match.index}`}
        className="rounded-[2px] bg-white/25 px-0.5 text-white box-decoration-clone [box-shadow:inset_0_-0.1em_0_rgba(255,255,255,0.35)]"
      >
        {match[0]}
      </mark>,
    )
    last = match.index + match[0].length
  }

  if (last < text.length) {
    nodes.push(
      <span key={`n-${last}`} className="text-white">
        {text.slice(last)}
      </span>,
    )
  }

  return nodes
}
