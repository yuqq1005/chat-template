import { HiOutlineSparkles, HiOutlineSquares2X2 } from 'react-icons/hi2'
import { getModelLabel, getProvider, type ProviderId } from '../config/modelProviders'

interface ApiPanelProps {
  model: string
  providerId?: ProviderId
  presetLabel?: string
  onSwitchModel: () => void
}

export function ApiPanel({
  model,
  providerId = 'deepseek',
  presetLabel,
  onSwitchModel,
}: ApiPanelProps) {
  const provider = getProvider(providerId)
  const modelLabel = getModelLabel(model)
  const left = presetLabel ?? provider.name

  return (
    <div className="flex items-center justify-between gap-3 px-1 pb-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-white/75">
        <HiOutlineSparkles className="size-3.5 shrink-0 text-white/90" />
        <span className="truncate">
          {left}
          <span className="mx-1 text-white/35">|</span>
          {modelLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={onSwitchModel}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[12px] text-white/85 backdrop-blur-md transition hover:border-white/35 hover:bg-black/50 hover:text-white"
      >
        <HiOutlineSquares2X2 className="size-3.5" />
        切换模型
      </button>
    </div>
  )
}
