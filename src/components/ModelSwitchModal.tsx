import { useEffect, useMemo, useRef, useState } from 'react'
import { HiOutlineChevronDown, HiOutlineXMark } from 'react-icons/hi2'
import {
  PROVIDERS,
  getProvider,
  type ModelOption,
  type ProviderId,
} from '../config/modelProviders'
import {
  ConfigStorage,
  DEFAULT_CONFIG,
  DEFAULT_OUTPUT_CHARS_MAX,
  DEFAULT_OUTPUT_CHARS_MIN,
  MAX_MAX_TOKENS,
  MAX_OUTPUT_CHARS,
  MIN_MAX_TOKENS,
  MIN_OUTPUT_CHARS,
  normalizeMaxTokens,
  normalizeOutputCharsRange,
  type AppConfig,
} from '../utils/configStorage'
import { fetchRemoteModels } from '../utils/fetchModels'

interface ModelSwitchModalProps {
  open: boolean
  onClose: () => void
  onSaved: (config: AppConfig) => void
}

export function ModelSwitchModal({ open, onClose, onSaved }: ModelSwitchModalProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [providerOpen, setProviderOpen] = useState(false)
  const [remoteModels, setRemoteModels] = useState<ModelOption[] | null>(null)
  const [modelFilter, setModelFilter] = useState('')
  const providerRef = useRef<HTMLDivElement>(null)

  const provider = getProvider(config.providerId)

  const displayModels = useMemo(() => {
    const source = remoteModels ?? provider.models
    const q = modelFilter.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q),
    )
  }, [remoteModels, provider.models, modelFilter])

  useEffect(() => {
    if (!open) return
    setConfig(ConfigStorage.getConfig())
    setResult(null)
    setProviderOpen(false)
    setRemoteModels(null)
    setModelFilter('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (providerOpen) setProviderOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, providerOpen])

  useEffect(() => {
    if (!providerOpen) return
    const onPointer = (e: MouseEvent) => {
      if (providerRef.current?.contains(e.target as Node)) return
      setProviderOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [providerOpen])

  if (!open) return null

  const patch = (partial: Partial<AppConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }))

  const selectProvider = (id: ProviderId) => {
    const next = getProvider(id)
    patch({
      providerId: id,
      baseUrl: next.baseUrl || (id === 'custom' ? config.baseUrl : next.baseUrl),
      // 不预填可能不存在的模型，等拉取后再选
      model: '',
    })
    setRemoteModels(null)
    setModelFilter('')
    setProviderOpen(false)
    setResult(null)
  }

  const handleSave = () => {
    const chars = normalizeOutputCharsRange(config.outputCharsMin, config.outputCharsMax)
    const next: AppConfig = {
      ...config,
      baseUrl: (config.baseUrl || provider.baseUrl).replace(/\/$/, ''),
      model: config.model.trim(),
      providerId: config.providerId || provider.id,
      maxTokens: normalizeMaxTokens(config.maxTokens),
      ...chars,
    }
    if (!next.baseUrl) {
      setResult({ ok: false, message: '请填写 API Base URL' })
      return
    }
    if (!next.model) {
      setResult({ ok: false, message: '请先拉取并选择一个模型' })
      return
    }
    ConfigStorage.setConfig(next)
    setConfig(next)
    onSaved(next)
    setResult({ ok: true, message: '配置已保存' })
    onClose()
  }

  /** 测试 = 拉取 /models，用真实列表替换硬编码 */
  const handleFetchModels = async () => {
    if (!config.apiKey) {
      setResult({ ok: false, message: '请先填写 API Key' })
      return
    }
    const baseUrl = (config.baseUrl || provider.baseUrl).replace(/\/$/, '')
    if (!baseUrl) {
      setResult({ ok: false, message: '请填写 API Base URL' })
      return
    }

    setBusy(true)
    setResult(null)
    try {
      const models = await fetchRemoteModels(baseUrl, config.apiKey)
      setRemoteModels(models)

      // 若当前模型不在列表里，自动选中第一个；若在列表里则保留
      const stillValid = models.some((m) => m.id === config.model)
      if (!stillValid) {
        patch({ model: models[0]?.id ?? '' })
      }

      setResult({
        ok: true,
        message: `连接成功，已拉取 ${models.length} 个可用模型，请选择后保存`,
      })
    } catch (err) {
      setRemoteModels(null)
      setResult({
        ok: false,
        message: `拉取模型失败：${err instanceof Error ? err.message : '未知错误'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-panel flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-[rgba(14,16,24,0.92)] shadow-glass backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-switch-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="model-switch-title" className="font-display text-lg font-semibold text-white">
              切换模型
            </h2>
            <p className="mt-0.5 text-xs text-white/45">
              先填 Key → 拉取模型 → 再选择。Key 仅存本地
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            <HiOutlineXMark className="size-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="block space-y-1.5" ref={providerRef}>
            <span className="text-xs text-white/50">服务商</span>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={providerOpen}
                onClick={() => setProviderOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-left text-sm text-white outline-none transition hover:border-white/25 focus:border-[var(--accent-a)]/60"
              >
                <span>{provider.name}</span>
                <HiOutlineChevronDown
                  className={`size-4 text-white/50 transition ${providerOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {providerOpen && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-xl border border-white/12 bg-[rgba(22,24,34,0.98)] py-1 shadow-glass backdrop-blur-xl"
                >
                  {PROVIDERS.map((p) => {
                    const active = p.id === provider.id
                    return (
                      <li key={p.id} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => selectProvider(p.id)}
                          className={[
                            'flex w-full flex-col px-3 py-2.5 text-left text-sm transition',
                            active
                              ? 'bg-[var(--accent-a)]/20 text-white'
                              : 'text-white/75 hover:bg-white/8 hover:text-white',
                          ].join(' ')}
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.note && (
                            <span className="mt-0.5 text-[11px] text-white/40">{p.note}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">API Base URL（可改成你的中转地址）</span>
            <input
              value={config.baseUrl}
              onChange={(e) => {
                patch({ baseUrl: e.target.value })
                setRemoteModels(null)
              }}
              placeholder="https://api.example.com/v1"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent-a)]/60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">API Key</span>
            <input
              type="password"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e) => patch({ apiKey: e.target.value })}
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent-a)]/60"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/50">
                选择模型
                {remoteModels
                  ? `（接口返回 ${remoteModels.length} 个）`
                  : '（请先拉取）'}
              </span>
            </div>

            {(remoteModels?.length ?? 0) > 8 && (
              <input
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                placeholder="筛选模型…"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--accent-a)]/60"
              />
            )}

            {!remoteModels && (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-4 text-center text-xs leading-relaxed text-white/45">
                点击下方「拉取模型 / 测试连接」
                <br />
                会请求 <code className="text-white/60">GET /models</code> 获取该 Key 真实可用模型
              </div>
            )}

            {remoteModels && displayModels.length === 0 && (
              <p className="text-xs text-white/40">没有匹配的模型，试试清空筛选</p>
            )}

            {remoteModels && displayModels.length > 0 && (
              <div className="grid max-h-52 gap-2 overflow-y-auto pr-0.5">
                {displayModels.map((m) => {
                  const active = config.model === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => patch({ model: m.id })}
                      className={[
                        'rounded-xl border px-3 py-2.5 text-left text-sm transition',
                        active
                          ? 'border-[var(--accent-a)]/70 bg-[var(--accent-a)]/15 text-white'
                          : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/25 hover:text-white',
                      ].join(' ')}
                    >
                      <span className="break-all font-medium">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {config.model && (
              <p className="break-all text-[11px] text-white/35">当前选中：{config.model}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">temperature</span>
              <span className="tabular-nums text-white/70">{config.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={config.temperature}
              onChange={(e) => patch({ temperature: Number(e.target.value) })}
              className="w-full accent-[var(--accent-a)]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white/50">输出上限 max_tokens</span>
              <input
                type="number"
                min={MIN_MAX_TOKENS}
                max={MAX_MAX_TOKENS}
                step={100}
                value={config.maxTokens}
                onChange={(e) =>
                  patch({ maxTokens: normalizeMaxTokens(e.target.value) })
                }
                className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right tabular-nums text-white/80 outline-none focus:border-[var(--accent-a)]/50"
              />
            </div>
            <input
              type="range"
              min={MIN_MAX_TOKENS}
              max={MAX_MAX_TOKENS}
              step={100}
              value={normalizeMaxTokens(config.maxTokens)}
              onChange={(e) =>
                patch({ maxTokens: normalizeMaxTokens(e.target.value) })
              }
              className="w-full accent-[var(--accent-a)]"
            />
            <p className="text-[11px] leading-relaxed text-white/35">
              主剧情单次生成上限（{MIN_MAX_TOKENS}–{MAX_MAX_TOKENS}）。调大可减少截断。
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white/50">目标中文字数</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={MIN_OUTPUT_CHARS}
                  max={MAX_OUTPUT_CHARS}
                  step={50}
                  value={config.outputCharsMin}
                  onChange={(e) => {
                    const next = normalizeOutputCharsRange(
                      e.target.value,
                      config.outputCharsMax,
                    )
                    patch(next)
                  }}
                  className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right tabular-nums text-white/80 outline-none focus:border-[var(--accent-a)]/50"
                />
                <span className="text-white/35">–</span>
                <input
                  type="number"
                  min={MIN_OUTPUT_CHARS}
                  max={MAX_OUTPUT_CHARS}
                  step={50}
                  value={config.outputCharsMax}
                  onChange={(e) => {
                    const next = normalizeOutputCharsRange(
                      config.outputCharsMin,
                      e.target.value,
                    )
                    patch(next)
                  }}
                  className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-right tabular-nums text-white/80 outline-none focus:border-[var(--accent-a)]/50"
                />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-white/35">
              写入主模型提示词「篇幅」（默认 {DEFAULT_OUTPUT_CHARS_MIN}–
              {DEFAULT_OUTPUT_CHARS_MAX}）。这是软引导，不是硬截断；硬上限仍看上方
              max_tokens。
            </p>
          </div>

          {result && (
            <p
              className={`max-h-28 overflow-y-auto rounded-xl px-3 py-2 text-xs leading-relaxed ${
                result.ok
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-red-500/15 text-red-300'
              }`}
            >
              {result.message}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleFetchModels}
            className="flex-1 rounded-full border border-white/15 bg-white/5 py-2.5 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50"
          >
            {busy ? '拉取中…' : '拉取模型 / 测试连接'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110"
          >
            保存并应用
          </button>
        </div>
      </div>
    </div>
  )
}
