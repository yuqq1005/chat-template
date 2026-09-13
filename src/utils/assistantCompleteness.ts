import { sanitizeModelOutputForDisplay } from './sanitizeModelOutput'

/**
 * 判断助手正文是否像被截断（句中/段中未收束）。
 * 用于 finish_reason=length / content_filter 之外，接口仍返回 stop 但文末残缺的情况。
 */
export function looksLikeTruncatedAssistantText(text: string): boolean {
  const t = sanitizeModelOutputForDisplay(text).trim()
  if (!t) return false

  const asciiQuotes = (t.match(/"/g) || []).length
  if (asciiQuotes % 2 === 1) return true

  if (/[,，、：:；;]$/.test(t)) return true

  // 正常收束：句末标点或闭合引号
  if (/[。！？…”"]$/.test(t)) return false

  // 以汉字/字母/数字结尾且无句末标点 → 多半写到一半断了
  return /[\u4e00-\u9fffA-Za-z0-9]$/.test(t)
}

export function shouldContinueAssistant(finishReason: string | undefined, text: string): boolean {
  if (!text.trim()) return false
  if (finishReason === 'length' || finishReason === 'content_filter') return true
  return looksLikeTruncatedAssistantText(text)
}

export const ASSISTANT_CONTINUE_PROMPT =
  '【续写】上文因中断未写完。请紧接末尾无缝续写，不要重复已有文字；先补完未完成的句子与自然段，再自然收束并把话头留给用户。不要在汉字之间插入任何特殊符号或空格。对白继续用英文双引号 ""。只输出续写正文。'
