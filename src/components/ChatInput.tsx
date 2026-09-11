import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { HiOutlinePaperAirplane } from 'react-icons/hi2'

interface ChatInputProps {
  disabled?: boolean
  onSend: (text: string) => void
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/45 py-1.5 pl-5 pr-1.5 shadow-glass backdrop-blur-2xl">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="请输入你想说的话..."
          className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="发送"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] text-white shadow-orb transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40"
        >
          <HiOutlinePaperAirplane
            className="size-5 -translate-y-px translate-x-px -rotate-45"
            strokeWidth={2}
          />
        </button>
      </div>
    </form>
  )
}
