/**
 * 仅用于前端展示：去掉模型偶发夹在字间的修饰符。
 * 存储 / 发给模型的上下文请保留原文，不要在入库前调用。
 * 例：贺ˡ之ˡ炀 → 贺之炀（U+02E1）
 */
export function sanitizeModelOutputForDisplay(text: string): string {
  if (!text) return text
  return text.replace(/\u02E1/g, '')
}

/** @deprecated 使用 sanitizeModelOutputForDisplay；勿在入库路径调用 */
export const sanitizeModelOutput = sanitizeModelOutputForDisplay
