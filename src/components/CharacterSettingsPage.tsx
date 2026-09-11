import { useEffect, useMemo, useRef, useState } from 'react'
import { HiOutlineCamera } from 'react-icons/hi2'
import {
  DEFAULT_CHARACTER,
  DEFAULT_CHARACTER_AVATAR,
  DEFAULT_NARRATIVE_STYLE,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_SPEAKING_STYLE_NOVEL,
  DEFAULT_USER_AVATAR,
  REPLY_MODE_OPTIONS,
  fileToAvatarDataUrl,
  type CharacterCard,
  type ReplyMode,
  loadCharacter,
  saveCharacter,
  withReplyMode,
} from '../utils/characterStorage'
import {
  composePersonality,
  parsePersonality,
  type PersonalityParts,
} from '../utils/personalityParts'
import { FieldInput, FieldLabel, FieldTextarea, SettingsSheet } from './SettingsSheet'

interface CharacterSettingsPageProps {
  open: boolean
  onBack: () => void
  onSaved?: (card: CharacterCard) => void
}

export function CharacterSettingsPage({ open, onBack, onSaved }: CharacterSettingsPageProps) {
  const peerFileRef = useRef<HTMLInputElement>(null)
  const userFileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<CharacterCard>(DEFAULT_CHARACTER)
  const [savedHint, setSavedHint] = useState(false)
  const [peerAvatarBusy, setPeerAvatarBusy] = useState(false)
  const [userAvatarBusy, setUserAvatarBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(loadCharacter())
    setSavedHint(false)
    setPeerAvatarBusy(false)
    setUserAvatarBusy(false)
  }, [open])

  const patch = (partial: Partial<CharacterCard>) =>
    setDraft((prev) => ({ ...prev, ...partial }))

  const personalityParts = useMemo(
    () => parsePersonality(draft.personality),
    [draft.personality],
  )

  const patchPersonality = (partial: Partial<PersonalityParts>) => {
    setDraft((prev) => {
      const nextParts = { ...parsePersonality(prev.personality), ...partial }
      return { ...prev, personality: composePersonality(nextParts) }
    })
  }

  const handleSave = () => {
    saveCharacter(draft)
    onSaved?.(draft)
    setSavedHint(true)
    window.setTimeout(() => setSavedHint(false), 1600)
  }

  const handleReset = () => {
    setDraft({ ...DEFAULT_CHARACTER })
  }

  const setReplyMode = (replyMode: ReplyMode) => {
    setDraft((prev) => withReplyMode(prev, replyMode))
  }

  const onPickPeerAvatar = async (file: File | undefined) => {
    if (!file) return
    setPeerAvatarBusy(true)
    try {
      const url = await fileToAvatarDataUrl(file)
      patch({ avatar: url })
    } catch {
      /* ignore */
    } finally {
      setPeerAvatarBusy(false)
      if (peerFileRef.current) peerFileRef.current.value = ''
    }
  }

  const onPickUserAvatar = async (file: File | undefined) => {
    if (!file) return
    setUserAvatarBusy(true)
    try {
      const url = await fileToAvatarDataUrl(file)
      patch({ userAvatar: url })
    } catch {
      /* ignore */
    } finally {
      setUserAvatarBusy(false)
      if (userFileRef.current) userFileRef.current.value = ''
    }
  }

  return (
    <SettingsSheet
      open={open}
      title="文风与角色"
      subtitle="回复模式、角色卡与文风，会写入每次对话的系统提示"
      onBack={onBack}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
          >
            恢复默认
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-full bg-[linear-gradient(135deg,var(--accent-a),var(--accent-b))] py-2.5 text-sm font-medium text-white shadow-orb transition hover:brightness-110"
          >
            {savedHint ? '已保存' : '保存'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold text-white/90">角色卡</h2>

          <div className="flex items-center gap-3">
            <input
              ref={peerFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickPeerAvatar(e.target.files?.[0])}
            />
            <button
              type="button"
              title="更换角色头像"
              disabled={peerAvatarBusy}
              onClick={() => peerFileRef.current?.click()}
              className="group relative size-16 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 transition hover:ring-[var(--accent-a)]/60 disabled:opacity-60"
            >
              <img
                src={draft.avatar || DEFAULT_CHARACTER_AVATAR}
                alt=""
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                <HiOutlineCamera className="size-5 text-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/50">角色头像</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={peerAvatarBusy}
                  onClick={() => peerFileRef.current?.click()}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
                >
                  {peerAvatarBusy ? '处理中…' : '上传'}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ avatar: DEFAULT_CHARACTER_AVATAR })}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/40 transition hover:bg-white/5 hover:text-white/65"
                >
                  默认
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <FieldLabel>角色名</FieldLabel>
            <FieldInput
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="贺之炀"
            />
          </label>

          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <h3 className="text-xs font-medium text-white/70">角色设定</h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>年龄</FieldLabel>
                <FieldInput
                  value={personalityParts.age}
                  onChange={(e) => patchPersonality({ age: e.target.value })}
                  placeholder="20"
                />
              </label>
              <label className="block">
                <FieldLabel>身高</FieldLabel>
                <FieldInput
                  value={personalityParts.height}
                  onChange={(e) => patchPersonality({ height: e.target.value })}
                  placeholder="178cm"
                />
              </label>
            </div>

            <label className="block">
              <FieldLabel>身份</FieldLabel>
              <FieldTextarea
                rows={2}
                value={personalityParts.identity}
                onChange={(e) => patchPersonality({ identity: e.target.value })}
                placeholder="职业 / 年级 / 与用户的关系…"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <FieldLabel>气味</FieldLabel>
                <FieldInput
                  value={personalityParts.scent}
                  onChange={(e) => patchPersonality({ scent: e.target.value })}
                  placeholder="冷杉、洗衣液…"
                />
              </label>
              <label className="block">
                <FieldLabel>MBTI</FieldLabel>
                <FieldInput
                  value={personalityParts.mbti}
                  onChange={(e) => patchPersonality({ mbti: e.target.value })}
                  placeholder="ESTP"
                />
              </label>
            </div>

            <label className="block">
              <FieldLabel>外貌</FieldLabel>
              <FieldTextarea
                rows={3}
                value={personalityParts.appearance}
                onChange={(e) => patchPersonality({ appearance: e.target.value })}
                placeholder="发色、身材、穿搭…"
              />
            </label>

            <label className="block">
              <FieldLabel>语言风格（口头禅 · 用词偏好）</FieldLabel>
              <FieldTextarea
                rows={3}
                value={personalityParts.speechStyle}
                onChange={(e) => patchPersonality({ speechStyle: e.target.value })}
                placeholder="口头禅、称呼习惯、用词偏好…"
              />
            </label>
          </div>

          <label className="block">
            <FieldLabel>场景</FieldLabel>
            <FieldTextarea
              rows={3}
              value={draft.scenario}
              onChange={(e) => patch({ scenario: e.target.value })}
              placeholder="当前关系前提、故事背景…"
            />
          </label>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold text-white/90">文风</h2>
          <p className="text-[11px] leading-relaxed text-white/35">
            顶栏「模式」可快速切换「对话 / 旁白+玩法」与「普通 / 新鲜」。此处编辑对白与旁白细则。
          </p>

          <div>
            <FieldLabel>回复模式</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {REPLY_MODE_OPTIONS.map((opt) => {
                const active = draft.replyMode === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReplyMode(opt.value)}
                    className={[
                      'rounded-xl border px-3 py-2.5 text-left transition',
                      active
                        ? 'border-[var(--accent-a)]/55 bg-[var(--accent-a)]/15 text-white'
                        : 'border-white/10 bg-black/25 text-white/65 hover:bg-white/5',
                    ].join(' ')}
                  >
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="mt-0.5 block text-[11px] text-white/40">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block">
            <FieldLabel>
              {draft.replyMode === 'immersive_novel' ? '对白腔' : '说话方式'}
            </FieldLabel>
            <FieldTextarea
              rows={4}
              value={draft.speakingStyle}
              onChange={(e) => patch({ speakingStyle: e.target.value })}
              placeholder={
                draft.replyMode === 'immersive_novel'
                  ? '口语、称呼、卡壳、场景隐喻…'
                  : '短句、口语、毒舌或温柔…'
              }
            />
          </label>

          {draft.replyMode === 'immersive_novel' && (
            <>
              <label className="block">
                <FieldLabel>旁白文风</FieldLabel>
                <FieldTextarea
                  rows={5}
                  value={draft.narrativeStyle}
                  onChange={(e) => patch({ narrativeStyle: e.target.value })}
                  placeholder="视角、开场宕机、感官、情绪弧…"
                />
              </label>
              <label className="block">
                <FieldLabel>输出格式契约</FieldLabel>
                <FieldTextarea
                  rows={8}
                  value={draft.outputFormat}
                  onChange={(e) => patch({ outputFormat: e.target.value })}
                  placeholder="结构步骤、长度、禁止项…"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  patch({
                    narrativeStyle: DEFAULT_NARRATIVE_STYLE,
                    outputFormat: DEFAULT_OUTPUT_FORMAT,
                    speakingStyle: DEFAULT_SPEAKING_STYLE_NOVEL,
                  })
                }
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-white/45 transition hover:bg-white/5 hover:text-white/70"
              >
                填入小说体默认契约
              </button>
            </>
          )}

          <label className="block">
            <FieldLabel>额外指令</FieldLabel>
            <FieldTextarea
              rows={3}
              value={draft.customPrompts}
              onChange={(e) => patch({ customPrompts: e.target.value })}
              placeholder="输出格式、禁忌等"
            />
          </label>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold text-white/90">用户侧</h2>

          <div className="flex items-center gap-3">
            <input
              ref={userFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickUserAvatar(e.target.files?.[0])}
            />
            <button
              type="button"
              title="更换头像"
              disabled={userAvatarBusy}
              onClick={() => userFileRef.current?.click()}
              className="group relative size-16 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 transition hover:ring-[var(--accent-a)]/60 disabled:opacity-60"
            >
              <img
                src={draft.userAvatar || DEFAULT_USER_AVATAR}
                alt=""
                className="size-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                <HiOutlineCamera className="size-5 text-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/50">你的头像</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={userAvatarBusy}
                  onClick={() => userFileRef.current?.click()}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 transition hover:bg-white/10"
                >
                  {userAvatarBusy ? '处理中…' : '上传'}
                </button>
                <button
                  type="button"
                  onClick={() => patch({ userAvatar: DEFAULT_USER_AVATAR })}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/40 transition hover:bg-white/5 hover:text-white/65"
                >
                  默认
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <FieldLabel>你的名字</FieldLabel>
            <FieldInput
              value={draft.userName}
              onChange={(e) => patch({ userName: e.target.value })}
              placeholder="我"
            />
          </label>
          <label className="block">
            <FieldLabel>你的人设（可选）</FieldLabel>
            <FieldTextarea
              rows={3}
              value={draft.userPersona}
              onChange={(e) => patch({ userPersona: e.target.value })}
              placeholder="对方眼里的你…"
            />
          </label>
        </section>
      </div>
    </SettingsSheet>
  )
}
