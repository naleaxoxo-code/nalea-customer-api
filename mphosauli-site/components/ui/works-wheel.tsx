"use client"

// A portfolio index built as a wheel you turn (adapted from 21st.dev "works-wheel").
//
// At rest the work sits in a ring around a title, each card tangent to the
// circle. The first notch of scroll blows the ring open into a vertical drum:
// the card at the front lies flat and full size, the ones above and below
// rotate away into perspective. Keep turning and the drum carries the next
// piece round to the front.
//
// The whole thing is one number - `turn` - read by a single rAF pass that writes
// transforms straight to the DOM. 0 is the ring, 1 is the drum with item 0 at
// the front, and every whole number after that is one more item turned past.
//
// Changes for Mpho Sauli: cards are buttons, not links. Clicking the front card
// calls `onSelect` (opens the live preview); clicking any other card turns it to
// the front first. Colours follow the site's dark glass look.
import * as React from "react"

import { cn } from "@/lib/utils"

export interface WorksWheelItem {
  /** Project name. Shown beside the front card and in the index. */
  title: string
  /** Small caps line above the title, e.g. "Luxury · Beauty". */
  tag?: string
  /** Cover art. Any src an <img> takes. */
  image: string
}

export interface WorksWheelProps extends Omit<React.ComponentPropsWithoutRef<"section">, "children" | "onSelect"> {
  items: WorksWheelItem[]
  /** Sits in the middle of the ring. */
  label?: React.ReactNode
  /** Label on the front card's hover affordance. */
  action?: string
  /** Called when the card at the front is clicked. */
  onSelect?: (index: number) => void
}

/* Geometry. The card is measured against the stage; everything else against the card. */
const CARD_H = 0.38 // front card height, of the stage
const CARD_MAX_W = 0.34 // ... but never wider than this much of the stage
const CARD_MAX_W_NARROW = 0.78 // on phones the card may take most of the width
const CARD_RATIO = 1.45 // card width / height
const STEP = 40 // degrees between cards on the drum
const DRUM = 2.22 // drum radius, in card heights
const LENS = 2.7 // perspective distance
const RING_R = 1.14 // ring radius
const BOW = 1.82 // radius of the sideways arc the strip curves round
const TITLE = 0.124 // ring label and front-card title
const INDEX = 0.04 // the index down the right-hand side
/** Items either side of the front still worth drawing. */
const CULL = 1.6

/** How much of a wheel-notch or a dragged pixel counts as one item. */
const WHEEL_UNITS = 900
const DRAG_UNITS = 420
/** Pointer travel (px) after which a press counts as a drag, not a click. */
const CLICK_SLOP = 6
/** Quiet time after the last wheel event before the wheel settles on an item. */
const SETTLE = 140
/** Fraction of the remaining distance closed each frame. 1 = no smoothing. */
const EASE = 0.12

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rad = (deg: number) => (deg * Math.PI) / 180

type Stage = { w: number; h: number }

/** How far left the arc has carried something `drumDeg` off the front. */
const bowAt = (drumDeg: number, bow: number) => -bow * (1 - Math.cos(rad(drumDeg)))

/** Ring and drum in one transform chain, blended by `m`. */
function place(ringDeg: number, drumDeg: number, ringR: number, drumR: number, bow: number, m: number) {
  return (
    `translateX(${m * bowAt(drumDeg, bow)}px)` +
    ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * ringR}px)` +
    ` rotateX(${m * drumDeg}deg) translateZ(${m * drumR}px)`
  )
}

export function WorksWheel({ items, label = "Showroom", action = "Try it live", onSelect, className, ...props }: WorksWheelProps) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const wheelRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLElement | null)[]>([])
  const labelRef = React.useRef<HTMLDivElement>(null)
  const titleRef = React.useRef<HTMLDivElement>(null)

  // Only `active` is state - everything else is written to the DOM.
  const turn = React.useRef(0)
  const target = React.useRef(0)
  const [active, setActive] = React.useState(0)
  const [stage, setStage] = React.useState<Stage>({ w: 0, h: 0 })

  const count = items.length
  const last = Math.max(count - 1, 0)

  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener("change", read)
    return () => query.removeEventListener("change", read)
  }, [])

  React.useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const read = () => setStage({ w: el.clientWidth, h: el.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const narrow = stage.w > 0 && stage.w < 700

  const metrics = React.useMemo(() => {
    const { w, h } = stage
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * (narrow ? CARD_MAX_W_NARROW : CARD_MAX_W))
    const cardH = cardW / CARD_RATIO
    const drumR = cardH * DRUM
    const ringR = cardH * RING_R
    // Shrink the ring's cards until the circle reads as a closed loop.
    const ringScale = count ? clamp((((2 * Math.PI * ringR) / count) * 0.82) / (cardW || 1), 0.16, 1) : 1
    return {
      cardW,
      cardH,
      ringR,
      ringScale,
      drumR,
      // On phones the arc would push neighbours off-screen; keep it gentler.
      bow: cardH * (narrow ? BOW * 0.4 : BOW),
      depth: cardH * LENS,
      title: cardH * TITLE,
      index: cardH * INDEX,
    }
  }, [stage, count, narrow])

  // One pass per frame: ease toward the target, then write every transform.
  React.useEffect(() => {
    if (!stage.h) return
    let frame = 0
    const { ringR, ringScale, drumR, bow } = metrics

    const draw = () => {
      frame = requestAnimationFrame(draw)
      const gap = target.current - turn.current
      if (Math.abs(gap) < 0.0005) turn.current = target.current
      else turn.current += gap * (reduced ? 1 : EASE)

      const t = turn.current
      const m = clamp(t, 0, 1)
      const pos = Math.max(0, t - 1)

      if (wheelRef.current) wheelRef.current.style.transform = `translateZ(${-m * drumR}px)`

      for (let i = 0; i < count; i++) {
        const d = i - pos
        const card = cardRefs.current[i]
        if (card) {
          card.style.transform = place(d * (360 / count), d * STEP, ringR, drumR, bow, m)
          const hidden = m > 0.5 && Math.abs(d) > CULL
          card.style.opacity = hidden ? "0" : "1"
          card.style.pointerEvents = hidden ? "none" : ""
          card.style.zIndex = String(Math.round(100 - Math.abs(d) * 2))
        }
        const face = card?.firstElementChild as HTMLElement | null
        if (face) face.style.transform = `scale(${lerp(ringScale, 1, m)})`
      }

      if (labelRef.current) labelRef.current.style.opacity = String(1 - m)
      if (titleRef.current) titleRef.current.style.opacity = String(m)
      const near = clamp(Math.round(pos), 0, last)
      setActive((prev) => (prev === near ? prev : near))
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [metrics, stage.h, count, last, reduced])

  const to = React.useCallback(
    (next: number) => {
      target.current = clamp(next, 0, last + 1)
    },
    [last],
  )

  const settling = React.useRef(0)

  // Native listener so the wheel is cancellable - and it only cancels while it
  // still has somewhere to go, so the page scrolls on at either end.
  React.useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      const next = target.current + event.deltaY / WHEEL_UNITS
      if (next > 0 && next < last + 1) event.preventDefault()
      to(next)
      window.clearTimeout(settling.current)
      settling.current = window.setTimeout(() => to(Math.round(target.current)), SETTLE)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel)
      window.clearTimeout(settling.current)
    }
  }, [to, last])

  const drag = React.useRef<{ y: number; moved: number } | null>(null)
  const dragged = React.useRef(false)

  const pick = (i: number) => {
    // A press that turned the wheel is not a click.
    if (dragged.current) return
    const front = turn.current >= 0.99 && Math.round(Math.max(0, turn.current - 1)) === i
    if (front) onSelect?.(i)
    else to(i + 1)
  }

  return (
    <section
      aria-label={typeof label === "string" ? label : "Showroom"}
      className={cn("relative h-full min-h-[24rem] w-full overflow-hidden text-foreground select-none", className)}
      {...props}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="listbox"
        aria-label="Turn the wheel to browse. Press Enter to try the front design live."
        aria-activedescendant={`works-wheel-${active}`}
        className="absolute inset-0 cursor-grab touch-pan-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent active:cursor-grabbing"
        style={{ perspective: `${metrics.depth}px` }}
        onPointerDown={(event) => {
          drag.current = { y: event.clientY, moved: 0 }
          dragged.current = false
        }}
        onPointerMove={(event) => {
          const d = drag.current
          if (!d) return
          const dy = d.y - event.clientY
          d.moved += Math.abs(dy)
          d.y = event.clientY
          if (d.moved > CLICK_SLOP) {
            if (!dragged.current) event.currentTarget.setPointerCapture(event.pointerId)
            dragged.current = true
          }
          if (dragged.current) to(target.current + dy / DRAG_UNITS)
        }}
        onPointerUp={() => {
          drag.current = null
          if (target.current > 1) to(Math.round(target.current))
        }}
        onPointerCancel={() => {
          drag.current = null
          dragged.current = false
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") to(Math.round(target.current) + 1)
          else if (event.key === "ArrowUp") to(Math.round(target.current) - 1)
          else if (event.key === "Enter" || event.key === " ") {
            if (turn.current < 0.99) to(1)
            else onSelect?.(active)
          } else return
          event.preventDefault()
        }}
      >
        <div ref={wheelRef} className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]">
          {items.map((item, i) => (
            <button
              key={item.title}
              id={`works-wheel-${i}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={i === active}
              aria-label={i === active ? `${action}: ${item.title}` : item.title}
              onClick={() => pick(i)}
              ref={(node) => {
                cardRefs.current[i] = node
              }}
              className="group absolute [backface-visibility:hidden]"
              style={{
                width: metrics.cardW,
                height: metrics.cardH,
                marginLeft: -metrics.cardW / 2,
                marginTop: -metrics.cardH / 2,
              }}
            >
              <span className="relative block size-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_24px_60px_-20px_rgba(0,0,0,.9),0_0_40px_-12px_rgba(255,77,141,.35)]">
                <img src={item.image} alt="" draggable={false} loading="lazy" className="size-full object-cover object-top" />
                {i === active && onSelect ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-300 group-hover:bg-black/35 group-hover:opacity-100">
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-2xl">▶ {action}</span>
                  </span>
                ) : null}
                <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-white/85 uppercase backdrop-blur">
                  <i className="size-1.5 rounded-full bg-emerald-400" /> Live demo
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ring label and front-card title trade places across the transition. */}
      <div
        ref={labelRef}
        className="pointer-events-none absolute inset-0 grid place-items-center text-center font-black tracking-tight"
        style={{ fontSize: metrics.title }}
      >
        {label}
      </div>
      <div
        ref={titleRef}
        className={cn(
          "pointer-events-none absolute opacity-0",
          narrow ? "inset-x-4 bottom-[4%] rounded-2xl bg-black/75 px-4 py-3 text-center backdrop-blur-md" : "top-1/2 left-[5%] max-w-[24%] -translate-y-1/2",
        )}
      >
        {items[active]?.tag ? (
          <p className="mb-2 font-mono text-[10px] tracking-[0.25em] text-accent uppercase">{items[active].tag}</p>
        ) : null}
        <p className="font-black leading-none tracking-tight" style={{ fontSize: narrow ? 26 : metrics.title }}>
          {items[active]?.title}
        </p>
      </div>

      {narrow ? null : (
        <ol className="absolute top-[7.5%] right-[2.5%] text-right leading-[1.75] text-muted-foreground" style={{ fontSize: Math.max(12, metrics.index) }}>
          {items.map((item, i) => (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => to(i + 1)}
                className={cn(
                  "cursor-pointer transition-colors outline-none hover:text-white focus-visible:outline-1 focus-visible:outline-accent",
                  i === active && "font-semibold text-white",
                )}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default WorksWheel
