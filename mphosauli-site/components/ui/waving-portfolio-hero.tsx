"use client"

// Waving Portfolio Hero — after the 21st.dev "Waving Portfolio Landing".
// Three acts: a wall of shuffling letters slides past, the big letters slice
// into place, then the poster settles — name either side of a waving
// character, rules drawing out, a stamp spinning in. Click to replay.

import * as React from "react"

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const rand = (n: number) => Array.from({ length: n }, () => ABC[Math.floor(Math.random() * 26)]).join("")

export interface WavingPortfolioHeroProps {
  left?: [string, string]
  right?: [string, string]
  topLeft?: string
  topRight?: string
  bottomLeft?: string
  bottomRight?: string
  stamp?: [string, string]
  /** Cut-out photo (transparent PNG) shown between the name halves. */
  photo?: string
  children?: React.ReactNode
}

function Wall() {
  const [rows, setRows] = React.useState<string[]>(() => Array.from({ length: 8 }, () => "MPHOSAULIMPHOSAULIMPHOSAULIMPHOSAU"))
  React.useEffect(() => {
    setRows(Array.from({ length: 8 }, () => rand(34)))
    const id = setInterval(() => setRows((r) => r.map((s) => (Math.random() < 0.5 ? rand(34) : s))), 110)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="wph-wall" aria-hidden="true">
      {rows.map((s, i) => (
        <div key={i} className={"wph-row " + (i % 2 ? "wph-out" : "wph-fill")} style={{ animationDirection: i % 2 ? "reverse" : "normal" }}>
          {s}
        </div>
      ))}
    </div>
  )
}

function Glyphs({ text, delay }: { text: string; delay: number }) {
  return (
    <span className="wph-word">
      {text.split("").map((c, i) => (
        <span key={i} className="wph-glyph" style={{ animationDelay: delay + i * 0.09 + "s" }}>
          <span className="wph-half wph-top">{c}</span>
          <span className="wph-half wph-bot" style={{ animationDelay: delay + i * 0.09 + 0.12 + "s" }}>
            {c}
          </span>
        </span>
      ))}
    </span>
  )
}

function MatrixRain() {
  const ref = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノMPHOSAULI0123456789<>/{}#$%"
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let drops: number[] = []
    const fs = 15
    const size = () => {
      const r = c.getBoundingClientRect()
      w = r.width
      h = r.height
      c.width = w * dpr
      c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drops = Array.from({ length: Math.ceil(w / fs) }, () => Math.random() * -40)
    }
    size()
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (t - last < 45) return
      last = t
      // fade the trails without painting a background, so the canvas stays see-through
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,.14)"
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = "source-over"
      ctx.font = "600 " + fs + "px ui-monospace, Menlo, monospace"
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * fs
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)]
        ctx.fillStyle = "#ffffff"
        ctx.fillText(ch, i * fs, y)
        ctx.fillStyle = i % 3 === 0 ? "rgba(57,255,140,.85)" : "rgba(255,77,141,.85)"
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * fs, y - fs)
        drops[i] = y > h && Math.random() > 0.96 ? 0 : drops[i] + 1
      }
    }
    raf = requestAnimationFrame(tick)
    const ro = new ResizeObserver(size)
    ro.observe(c)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])
  return <canvas ref={ref} className="wph-matrix" aria-hidden="true" />
}

export default function WavingPortfolioHero({
  left = ["MP", "HO"],
  right = ["SAU", "LI"],
  topLeft = "MPHO SAULI",
  topRight = "2026",
  bottomLeft = "WEB DESIGNER",
  bottomRight = "ADS & BRANDS",
  stamp = ["MPHO", "SAULI"],
  photo,
  children,
}: WavingPortfolioHeroProps) {
  const [run, setRun] = React.useState(0)
  const [act, setAct] = React.useState(0)
  React.useEffect(() => {
    setAct(0)
    const a = setTimeout(() => setAct(1), 2300)
    const b = setTimeout(() => setAct(2), 3900)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [run])

  return (
    <section className="wph-root" data-act={act} onClick={() => act === 2 && setRun((r) => r + 1)}>
      <style>{CSS}</style>
      <div className="wph-blobs" aria-hidden="true"><i /><i /><i /></div>
      <span className="wph-corner wph-tl" aria-hidden="true"><i /><i /></span>
      <span className="wph-corner wph-tr" aria-hidden="true"><i /></span>

      {act === 0 ? <Wall key={run} /> : null}

      {act >= 1 ? (
        <div className="wph-poster" key={run}>
          <div className="wph-rule-row wph-toprow">
            <span>{topLeft}</span>
            <i className="wph-line"><b /><b /><b /></i>
            <span>{topRight}</span>
          </div>
          <div className="wph-mid">
            <div className="wph-col">
              <Glyphs text={left[0]} delay={0} />
              <Glyphs text={left[1]} delay={0.25} />
            </div>
            <div className="wph-charwrap">{act === 2 ? (photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <div className="wph-char wph-photowrap">
                <div className="wph-aura" aria-hidden="true" />
                <MatrixRain />
                <img src={photo} alt="Mpho Sauli" className="wph-photo" />
                <img src={photo} alt="" aria-hidden="true" className="wph-photo wph-ghost wph-ghost-a" />
                <img src={photo} alt="" aria-hidden="true" className="wph-photo wph-ghost wph-ghost-b" />
                <i className="wph-scan" aria-hidden="true" />
              </div>
            ) : (
              <div className="wph-char wph-ph">Your photo here</div>
            )) : null}</div>
            <div className="wph-col">
              <Glyphs text={right[0]} delay={0.15} />
              <Glyphs text={right[1]} delay={0.4} />
            </div>
          </div>
          <div className="wph-rule-row wph-botrow">
            <span>{bottomLeft}</span>
            <i className="wph-line"><b /><b /></i>
            <span>{bottomRight}</span>
          </div>
          <div className="wph-stamp" aria-hidden="true">
            <span>{stamp[0]}</span>
            <span>{stamp[1]}</span>
          </div>
          {children ? <div className="wph-children">{children}</div> : null}
        </div>
      ) : null}
      <h1 className="sr-only">Mpho Sauli — web designer, ads and brands</h1>
    </section>
  )
}

const CSS = `
.wph-root {
  --red: #ff4d8d; --cream: #050507; --ink: rgba(244,244,246,.55);
  position: relative; min-height: 100svh; overflow: hidden; background: var(--cream); color: var(--red);
  font-family: "Oswald", "Bebas Neue", "Arial Narrow", "Roboto Condensed", sans-serif; cursor: default;
}
.wph-blobs i { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5; animation: blob 18s ease-in-out infinite alternate; }
.wph-blobs i:nth-child(1) { width: 520px; height: 520px; left: -8%; top: 10%; background: #ff4d8d; }
.wph-blobs i:nth-child(2) { width: 460px; height: 460px; right: -6%; top: 25%; background: #6d5dfc; animation-delay: -6s; }
.wph-blobs i:nth-child(3) { width: 380px; height: 380px; left: 40%; bottom: -12%; background: #22d3ee; opacity: .3; animation-delay: -12s; }
.wph-root[data-act="2"] { cursor: pointer; }
.wph-wall { position: absolute; inset: -20% -10%; display: flex; flex-direction: column; justify-content: center; transform: rotate(-7deg); animation: wph-wall-out .6s ease-in 1.8s forwards; }
.wph-row { white-space: nowrap; font-size: clamp(70px, 13vh, 150px); line-height: .98; font-weight: 500; letter-spacing: .02em; animation: wph-slide 2.4s linear infinite; }
.wph-fill { color: var(--red); }
.wph-out { color: transparent; -webkit-text-stroke: 1.5px var(--ink); }
.wph-row:nth-child(4n+1) { -webkit-text-stroke: 2px var(--red); color: transparent; }
@keyframes wph-slide { from { transform: translateX(0) skewY(2deg); } to { transform: translateX(-12%) skewY(-2deg); } }
@keyframes wph-wall-out { to { transform: rotate(-7deg) scale(1.6); opacity: 0; filter: blur(6px); } }

.wph-poster { position: relative; z-index: 1; min-height: 100svh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2vh; padding: 90px 6vw 40px; }
.wph-rule-row { width: min(1100px, 100%); display: flex; align-items: center; gap: 24px; font-weight: 600; letter-spacing: .14em; font-size: clamp(14px, 1.6vw, 22px); }
.wph-rule-row > span { opacity: 0; animation: wph-fade .6s ease 1.6s forwards; white-space: nowrap; }
.wph-line { position: relative; flex: 1; height: 2px; background: var(--red); transform: scaleX(0); transform-origin: left; animation: wph-draw .9s cubic-bezier(.7,0,.2,1) 1.3s forwards; display: flex; justify-content: space-between; align-items: center; }
.wph-line b { width: 10px; height: 10px; border-radius: 50%; background: var(--red); }
.wph-botrow .wph-line { transform-origin: right; }
@keyframes wph-draw { to { transform: scaleX(1); } }
@keyframes wph-fade { to { opacity: 1; } }

.wph-mid { width: min(1100px, 100%); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
.wph-col .wph-half { background: linear-gradient(180deg,#ffd1e3 0%,#ff4d8d 45%,#b14dff 75%,#8a7dff 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.wph-mid .wph-col { filter: drop-shadow(0 0 30px rgba(255,77,141,.35)); }
.wph-col { display: flex; flex-direction: column; line-height: .82; font-size: clamp(90px, 19vh, 230px); font-weight: 500; }
.wph-col:last-child { align-items: flex-end; }
.wph-word { display: flex; }
.wph-glyph { position: relative; display: inline-block; }
.wph-half { display: block; animation: wph-slice .75s cubic-bezier(.7,0,.2,1) both; animation-delay: inherit; }
.wph-glyph { animation: none; }
.wph-top { clip-path: inset(0 0 50% 0); --from: -60%; }
.wph-bot { position: absolute; inset: 0; clip-path: inset(50% 0 0 0); --from: 60%; }
.wph-glyph .wph-top { animation-delay: inherit; }
@keyframes wph-slice { from { transform: translateY(var(--from)); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }

.wph-charwrap { width: clamp(160px, 22vw, 300px); height: clamp(260px, 42vh, 470px); display: flex; align-items: flex-end; justify-content: center; }
.wph-char { width: 100%; height: 100%; animation: wph-pop .8s cubic-bezier(.34,1.5,.5,1) both; transform-origin: 50% 100%; }
@keyframes wph-pop { from { transform: translateY(40%) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
.wph-photowrap { position: relative; }
.wph-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: bottom; z-index: 2;
  filter: drop-shadow(0 30px 40px rgba(0,0,0,.6)) drop-shadow(0 0 30px rgba(255,77,141,.3));
  -webkit-mask-image: linear-gradient(180deg, #000 var(--rv), transparent calc(var(--rv) + 6%)); mask-image: linear-gradient(180deg, #000 var(--rv), transparent calc(var(--rv) + 6%));
  animation: wph-decode 1.5s steps(24) 1.1s both, wph-glitch 2.6s steps(1) 1.1s both; }
@property --rv { syntax: "<percentage>"; inherits: false; initial-value: -10%; }
@keyframes wph-decode { from { --rv: -10%; } to { --rv: 110%; } }
@keyframes wph-glitch {
  0% { transform: translateX(-6px) skewX(4deg); filter: hue-rotate(90deg) saturate(2) drop-shadow(0 0 30px #39ff8c); }
  10% { transform: translateX(5px); filter: hue-rotate(-60deg) saturate(1.6); }
  20% { transform: translateX(-3px) skewX(-3deg); filter: none; }
  32% { transform: translateX(2px); filter: hue-rotate(40deg) drop-shadow(0 0 20px #ff4d8d); }
  45%, 100% { transform: none; filter: drop-shadow(0 30px 40px rgba(0,0,0,.6)) drop-shadow(0 0 30px rgba(255,77,141,.3)); }
}
.wph-ghost { z-index: 1; opacity: 0; -webkit-mask-image: none; mask-image: none; }
.wph-ghost-a { filter: brightness(1.4) sepia(1) hue-rotate(280deg) saturate(6); animation: wph-ghost-a 2.6s steps(1) 1.1s both; }
.wph-ghost-b { filter: brightness(1.4) sepia(1) hue-rotate(80deg) saturate(6); animation: wph-ghost-b 2.6s steps(1) 1.1s both; }
@keyframes wph-ghost-a { 0%{opacity:.8;transform:translate(-14px,0)} 12%{opacity:.6;transform:translate(10px,-3px)} 26%{opacity:.5;transform:translate(-6px,2px)} 40%,100%{opacity:0;transform:none} }
@keyframes wph-ghost-b { 0%{opacity:.7;transform:translate(12px,2px)} 14%{opacity:.5;transform:translate(-9px,0)} 30%{opacity:.4;transform:translate(5px,-2px)} 42%,100%{opacity:0;transform:none} }
.wph-scan { position: absolute; left: -6%; right: -6%; height: 3px; z-index: 3; top: 0; background: linear-gradient(90deg, transparent, #39ff8c, #fff, #ff4d8d, transparent); box-shadow: 0 0 24px 6px rgba(57,255,140,.6); opacity: 0; animation: wph-scan 1.5s steps(24) 1.1s both; }
@keyframes wph-scan { 0% { top: 0; opacity: 1; } 96% { top: 100%; opacity: 1; } 100% { top: 100%; opacity: 0; } }
.wph-matrix { max-width: none; max-height: none; mix-blend-mode: screen; position: absolute; inset: -8% -18%; width: 136%; height: 116%; z-index: 0; -webkit-mask-image: radial-gradient(closest-side, #000 55%, transparent); mask-image: radial-gradient(closest-side, #000 55%, transparent); animation: wph-rain 3s ease 0s both; }
@keyframes wph-rain { 0% { opacity: 0; } 8% { opacity: 1; } 50% { opacity: 1; } 100% { opacity: .35; } }
.wph-aura { position: absolute; left: -40%; right: -40%; bottom: -20%; height: 110%; background: radial-gradient(closest-side, rgba(255,77,141,.4) 0%, rgba(138,125,255,.18) 45%, rgba(138,125,255,0) 100%); z-index: 0; pointer-events: none; }
.wph-ph { display: grid; place-items: center; border-radius: 28px; border: 1px dashed rgba(255,255,255,.25); background: rgba(255,255,255,.04); color: rgba(255,255,255,.4); font-family: ui-sans-serif, system-ui; font-size: 14px; }
.wph-wave { transform-origin: 160px 205px; animation: wph-waving 1.4s ease-in-out .6s infinite; }
@keyframes wph-waving { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(10deg); } }

.wph-stamp { margin-top: 2vh; width: 72px; height: 72px; border: 2px solid var(--red); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 13px; letter-spacing: .05em; line-height: 1.15; opacity: 0; animation: wph-stamp .7s cubic-bezier(.34,1.5,.5,1) 2.2s forwards; }
@keyframes wph-stamp { from { opacity: 0; transform: scale(2) rotate(-90deg); } to { opacity: 1; transform: rotate(-8deg); } }

.wph-corner { position: absolute; top: 0; width: 88px; height: 88px; z-index: 2; background: linear-gradient(135deg, rgba(255,77,141,.9), rgba(138,125,255,.7)); box-shadow: 8px 8px 0 -4px var(--cream), 12px 12px 0 -4px var(--red), 18px 18px 0 -4px var(--cream), 22px 22px 0 -4px var(--red); }
.wph-tl { left: 0; border-bottom-right-radius: 4px; }
.wph-tr { right: 0; box-shadow: -8px 8px 0 -4px var(--cream), -12px 12px 0 -4px var(--red), -18px 18px 0 -4px var(--cream), -22px 22px 0 -4px var(--red); }
.wph-corner i { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #fff; }
.wph-tl i:first-child { left: 18px; top: 18px; } .wph-tl i:last-child { left: 46px; top: 46px; }
.wph-tr i { right: 30px; top: 30px; }

.wph-children { margin-top: 2vh; opacity: 0; animation: wph-fade .8s ease 2.6s forwards; }

@media (max-width: 700px) {
  .wph-mid { grid-template-columns: 1fr; justify-items: center; }
  .wph-col, .wph-col:last-child { align-items: center; font-size: 22vw; }
  .wph-charwrap { order: -1; height: 34vh; }
  .wph-corner { width: 56px; height: 56px; }
}
@media (prefers-reduced-motion: reduce) {
  .wph-photo { --rv: 110%; }
  .wph-root *, .wph-root *::before { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`
