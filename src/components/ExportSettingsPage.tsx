import { useEffect, useState } from 'react'
import { loadCharacter } from '../utils/characterStorage'
import {
  buildExportDocxBlob,
  buildExportFilename,
  downloadBlob,
} from '../utils/exportDocx'
import { loadMessages } from '../utils/messageStore'
import { FieldLabel, SettingsSheet } from './SettingsSheet'

interface ExportSettingsPageProps {
  open: boolean
  onBack: () => void
}

export function ExportSettingsPage({ open, onBack }: ExportSettingsPageProps) {
  const [includeCharacter, setIncludeCharacter] = useState(true)
  const [includeStyle, setIncludeStyle] = useState(true)
  const [includeChat, setIncludeChat] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setIncludeCharacter(true)
    setIncludeStyle(true)
    setIncludeChat(false)
    setBusy(false)
    setHint(null)
  }, [open])

  const anySelected = includeCharacter || includeStyle || includeChat

  const handleExport = async () => {
    if (!anySelected || busy) return
    setBusy(true)
    setHint(null)
    try {
      const character = loadCharacter()
      const messages = includeChat ? await loadMessages() : []
      const blob = await buildExportDocxBlob({
        includeCharacter,
        includeStyle,
        includeChat,
        character,
        messages,
      })
      downloadBlob(
        blob,
        buildExportFilename({
          includeCharacter,
          includeStyle,
          includeChat,
          characterName: character.name,
        }),
      )
      setHint('已开始下载')
      window.setTimeout(() => setHint(null), 2000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败'
      setHint(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsSheet
      open={open}
      title="导出"
      subtitle="生成 .docx，可选角色 / 文风 / 聊天记录"
      onBack={onBack}
      footer={
        <button
          type="button"
          disabled={!anySelected || busy}
          onClick={() => void handleExport()}
          className="w-full rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '正在生成…' : hint === '已开始下载' ? '已开始下载' : '导出为 Word'}
        </button>
      }
    >
      <div className="space-y-5">
        <p className="text-[11px] leading-relaxed text-white/40">
          仅导出、不导入。聊天记录若某条带有页眉或玩法面板，会一并写入；没有则只写正文。
        </p>

        <section className="space-y-3">
          <FieldLabel>导出内容</FieldLabel>
          <ExportToggle
            title="角色"
            desc="姓名、人设、场景、开场白、用户侧"
            checked={includeCharacter}
            onChange={setIncludeCharacter}
          />
          <ExportToggle
            title="文风"
            desc="回复模式、对白腔、旁白、输出格式、额外指令"
            checked={includeStyle}
            onChange={setIncludeStyle}
          />
          <ExportToggle
            title="聊天记录"
            desc="消息列表；有页眉/玩法则附带"
            checked={includeChat}
            onChange={setIncludeChat}
          />
        </section>

        {hint && hint !== '已开始下载' ? (
          <p className="text-[12px] text-amber-200/90">{hint}</p>
        ) : null}
      </div>
    </SettingsSheet>
  )
}

function ExportToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3 text-left transition hover:bg-white/5"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white/90">{title}</span>
        <span className="mt-0.5 block text-[11px] text-white/40">{desc}</span>
      </span>
      <span
        role="switch"
        aria-checked={checked}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full transition',
          checked
            ? 'bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))]'
            : 'bg-white/15',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition',
            checked ? 'left-[1.35rem]' : 'left-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  )
}
