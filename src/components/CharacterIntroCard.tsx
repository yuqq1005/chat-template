import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_INTRO, type IntroDiaryEntry } from '../data/characterIntro'
import { parsePersonality } from '../utils/personalityParts'
import './CharacterIntroCard.css'

interface CharacterIntroCardProps {
  name: string
  avatar: string
  personality: string
}

function Barcode() {
  return (
    <svg className="barcode" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y="0" width="3" height="20" fill="#F9FAFB" />
      <rect x="5" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="8" y="0" width="4" height="20" fill="#F9FAFB" />
      <rect x="14" y="0" width="2" height="20" fill="#F9FAFB" />
      <rect x="18" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="22" y="0" width="5" height="20" fill="#F9FAFB" />
      <rect x="29" y="0" width="2" height="20" fill="#F9FAFB" />
      <rect x="33" y="0" width="3" height="20" fill="#F9FAFB" />
      <rect x="38" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="42" y="0" width="4" height="20" fill="#F9FAFB" />
      <rect x="48" y="0" width="2" height="20" fill="#F9FAFB" />
      <rect x="52" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="56" y="0" width="6" height="20" fill="#F9FAFB" />
      <rect x="64" y="0" width="2" height="20" fill="#F9FAFB" />
      <rect x="68" y="0" width="3" height="20" fill="#F9FAFB" />
      <rect x="73" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="76" y="0" width="4" height="20" fill="#F9FAFB" />
      <rect x="82" y="0" width="2" height="20" fill="#F9FAFB" />
      <rect x="86" y="0" width="1" height="20" fill="#F9FAFB" />
      <rect x="90" y="0" width="5" height="20" fill="#F9FAFB" />
      <rect x="97" y="0" width="3" height="20" fill="#F9FAFB" />
    </svg>
  )
}

function findScrollParent(el: HTMLElement | null): Element | null {
  let node: HTMLElement | null = el
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node
    }
    node = node.parentElement
  }
  return null
}

export function CharacterIntroCard({ name, avatar, personality }: CharacterIntroCardProps) {
  const parts = parsePersonality(personality)
  const age = parts.age.trim() || '24'
  const height = parts.height.trim() || '184cm'
  const subtitle = DEFAULT_INTRO.subtitle
  const appearance = DEFAULT_INTRO.look
  const mbti = parts.mbti.trim()
  const displayName = name.trim() || '陆珩'
  const [open, setOpen] = useState(false)
  const [inView, setInView] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const diaryRef = useRef<HTMLDivElement>(null)
  const petals = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        size: 6 + ((i * 37) % 7),
        left: ((i * 17 + 11) % 100),
        duration: 4 + ((i * 13) % 5),
        delay: (i * 0.35) % 6,
      })),
    [],
  )

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const scrollRoot = findScrollParent(el)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setInView(entry.isIntersecting)
        })
      },
      { root: scrollRoot, threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const rootEl = diaryRef.current
    if (!rootEl) return

    const targets = rootEl.querySelectorAll('.char-diary-row')
    const scrollRoot = findScrollParent(rootEl)

    const reveal = (el: Element) => el.classList.add('is-visible')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          if (entry.target === rootEl) {
            targets.forEach(reveal)
            return
          }
          reveal(entry.target)
        })
      },
      { root: scrollRoot, rootMargin: '120px 0px', threshold: 0.01 },
    )

    observer.observe(rootEl)
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  const rootClass = [
    'char-intro',
    open ? 'is-open' : '',
    inView ? 'in-view' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      ref={rootRef}
      className={rootClass}
      aria-label={`${displayName} 介绍`}
    >
      <div
        className="char-intro-card"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => {
          if (!open) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <div
          className="char-intro-hero"
          onClick={(e) => {
            if (!open) return
            e.stopPropagation()
            setOpen(false)
          }}
        >
          <span className="char-intro-corner tl" />
          <img src={avatar} alt="" />
          <span className="char-intro-corner br" />
          <div className="char-intro-hollow">{DEFAULT_INTRO.latin}</div>
          <div className="char-intro-overlay">
            <div className="char-intro-kicker">{DEFAULT_INTRO.englishHead}</div>
            <div className="char-intro-tags">
              <span className="char-intro-tag">#{age}</span>
              <span className="char-intro-tag">{height.toUpperCase()}</span>
              <span className="char-intro-tag">表哥</span>
            </div>
            <div className="char-intro-name">{displayName}</div>
          </div>
        </div>

        <div
          className="char-intro-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="char-intro-title-row">
            <div className="char-intro-title">{displayName}</div>
            <div className="char-intro-pinyin">{DEFAULT_INTRO.pinyin}</div>
          </div>
          <div className="char-intro-sub">{subtitle}</div>
          <div className="char-intro-sep">{DEFAULT_INTRO.sep}</div>
          <div className="char-intro-flex">
            <p className="char-intro-quote">{DEFAULT_INTRO.quoteLine}</p>
            {mbti ? <span className="char-intro-hl">{mbti}</span> : null}
          </div>
          <div className="char-intro-detail">
            <span>HEIGHT</span>
            <span className="char-intro-h">{height.toUpperCase()}</span>
          </div>
          {appearance ? (
            <div className="char-intro-row">
              <div className="char-intro-label">外貌特征</div>
              <div className="char-intro-val">{appearance}</div>
            </div>
          ) : null}
          <div className="char-intro-row" style={{ borderBottom: 'none', marginBottom: 0 }}>
            <div className="char-intro-label">家庭成员</div>
            <div className="char-intro-family">
              <div className="char-intro-family-item">
                <span className="char-intro-chip">生父生母</span>
                <span>十四岁那年意外离世</span>
              </div>
              <div className="char-intro-family-item">
                <span className="char-intro-chip">寄养家庭</span>
                <span>待他宽厚，嘱他照看你</span>
              </div>
            </div>
          </div>
          <div className="char-intro-deco">
            <div className="char-intro-deco-l">
              love
              <br />
              is in
              <br />
              the air
            </div>
            <div className="char-intro-barcode">
              <Barcode />
              <span>LU-HENG</span>
            </div>
          </div>
        </div>
      </div>

      <div className="char-intro-more">
        <div className="char-catch-stage" aria-label={DEFAULT_INTRO.catchphrase}>
          <div className="char-catch-line char-catch-line-1" />
          <div className="char-catch-line char-catch-line-2" />
          <div className="char-catch-line char-catch-line-3" />
          <div className="char-catch-line char-catch-line-4" />
          <div className="char-catch-cross char-catch-c1" />
          <div className="char-catch-cross char-catch-c2" />

          <div className="char-catch-cut" aria-hidden>
            {DEFAULT_INTRO.catchCut}
            <div className="char-catch-cut-top">{DEFAULT_INTRO.catchCut}</div>
            <div className="char-catch-cut-bottom">{DEFAULT_INTRO.catchCut}</div>
          </div>

          <div className="char-catch-sub">
            {Array.from(DEFAULT_INTRO.catchphrase).map((char, index) =>
              char === ' ' ? (
                <span key={`sp-${index}`} className="char-catch-sub-char is-space" />
              ) : (
                <span
                  key={`${char}-${index}`}
                  className="char-catch-sub-char"
                  style={{ animationDelay: `${0.8 + index * 0.12}s` }}
                >
                  {char}
                </span>
              ),
            )}
          </div>

          {petals.map((p) => (
            <div
              key={p.id}
              className="char-catch-petal"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.left}%`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="char-diary-wrapper" ref={diaryRef}>
          {DEFAULT_INTRO.diary.map((entry: IntroDiaryEntry, i) => {
            const reverse = i % 2 === 1
            return (
              <div
                key={entry.title}
                className={reverse ? 'char-diary-row is-reverse' : 'char-diary-row'}
              >
                <div className="char-diary-frame">
                  <div className="char-diary-tape" />
                  <div className="char-diary-frame-inner">
                    <div className="char-diary-content">{entry.body}</div>
                  </div>
                </div>
                <div className="char-diary-typo">
                  <div className={reverse ? 'char-diary-line is-h' : 'char-diary-line is-v'} />
                  <div
                    className={
                      reverse ? 'char-diary-title is-right' : 'char-diary-title'
                    }
                  >
                    {entry.title}
                  </div>
                  <div className="char-diary-polaroid">
                    {entry.image ? (
                      <img src={entry.image} alt="" />
                    ) : (
                      <div className="char-diary-polaroid-ph" aria-hidden />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </article>
  )
}
