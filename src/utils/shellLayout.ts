/** PC 手机壳：fixed 浮层相对 data-app-shell 定位 */

export const APP_SHELL_SELECTOR = '[data-app-shell]'

export function getAppShellRect(): DOMRect | null {
  return document.querySelector(APP_SHELL_SELECTOR)?.getBoundingClientRect() ?? null
}

/** 将锚点 getBoundingClientRect 转为相对手机壳的坐标 */
export function anchorPopupStyle(
  anchor: DOMRect | undefined | null,
  opts?: { gap?: number; panelWidth?: number },
): { top: number; left: number; right: number } {
  const gap = opts?.gap ?? 8
  const panelWidth = opts?.panelWidth ?? 320
  const shell = getAppShellRect()

  if (!anchor) {
    return { top: 56, left: 16, right: 16 }
  }

  if (!shell) {
    return {
      top: anchor.bottom + gap,
      left: Math.max(8, Math.min(anchor.left, window.innerWidth - panelWidth - 8)),
      right: Math.max(8, window.innerWidth - anchor.right),
    }
  }

  const top = anchor.bottom - shell.top + gap
  const left = Math.max(8, Math.min(anchor.left - shell.left, shell.width - panelWidth - 8))
  const right = Math.max(8, shell.right - anchor.right)

  return { top, left, right }
}
