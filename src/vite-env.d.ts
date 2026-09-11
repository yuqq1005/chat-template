/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 新鲜模式句末附加提示词（来自 .env，非用户配置） */
  readonly VITE_FRESH_APPEND_PROMPT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.mp3' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}
