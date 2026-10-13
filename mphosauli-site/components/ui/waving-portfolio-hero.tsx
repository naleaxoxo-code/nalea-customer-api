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

function Character() {
  return (
    <svg className="wph-char" viewBox="0 0 220 420" aria-hidden="true">
      <g fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {/* body */}
        <path d="M58 200 Q60 170 110 165 Q160 170 162 200 L168 330 L52 330 Z" fill="#111" />
        {[...Array(26)].map((_, i) => (
          <circle key={i} cx={66 + ((i * 37) % 96)} cy={190 + ((i * 53) % 130)} r="1.6" fill="#fff" stroke="none" />
        ))}
        <path d="M92 168 L110 195 L128 168" stroke="#fff" strokeWidth="3" />
        {/* legs */}
        <path d="M58 330 L58 410 L162 410 L162 330" fill="#111" />
        {/* resting arm */}
        <path d="M60 205 Q40 260 70 300 Q95 315 112 300" strokeWidth="18" stroke="#111" />
        <circle cx="114" cy="298" r="11" fill="#fff" />
        {/* waving arm */}
        <g className="wph-wave">
          <path d="M160 205 Q190 170 195 120" strokeWidth="18" stroke="#111" />
          <path d="M190 128 Q178 100 182 78 M190 120 L190 70 M198 120 L203 72 M204 124 L214 84 M188 132 Q172 122 168 108" fill="#fff" strokeWidth="4" />
          <rect x="182" y="132" width="20" height="10" rx="2" fill="#111" />
        </g>
        {/* neck + head */}
        <path d="M98 150 L98 168 L122 168 L122 150" fill="#fff" />
        <ellipse cx="110" cy="105" rx="38" ry="48" fill="#fff" />
        <path d="M72 95 Q70 50 112 52 Q156 50 150 98 Q140 72 112 74 Q86 72 72 95 Z" fill="#111" />
        <rect x="80" y="100" width="24" height="18" rx="4" />
        <rect x="116" y="100" width="24" height="18" rx="4" />
        <path d="M104 108 L116 108" />
        <circle cx="92" cy="110" r="2.5" fill="#111" />
        <circle cx="128" cy="110" r="2.5" fill="#111" />
        <path d="M98 133 Q110 142 122 133" />
      </g>
    </svg>
  )
}

export default function WavingPortfolioHero({
  left = ["MP", "HO"],
  right = ["SAU", "LI"],
  topLeft = "MPHO SAULI",
  topRight = "2026",
  bottomLeft = "WEB DESIGNER",
  bottomRight = "ADS & BRANDS",
  stamp = ["MPHO", "SAULI"],
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
            <div className="wph-charwrap">{act === 2 ? <Character /> : null}</div>
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
  --red: #e5262f; --cream: #f4f1ec;
  position: relative; min-height: 100svh; overflow: hidden; background: var(--cream); color: var(--red);
  font-family: "Oswald", "Bebas Neue", "Arial Narrow", "Roboto Condensed", sans-serif; cursor: default;
}
.wph-root[data-act="2"] { cursor: pointer; }
.wph-wall { position: absolute; inset: -20% -10%; display: flex; flex-direction: column; justify-content: center; transform: rotate(-7deg); animation: wph-wall-out .6s ease-in 1.8s forwards; }
.wph-row { white-space: nowrap; font-size: clamp(70px, 13vh, 150px); line-height: .98; font-weight: 500; letter-spacing: .02em; animation: wph-slide 2.4s linear infinite; }
.wph-fill { color: var(--red); }
.wph-out { color: transparent; -webkit-text-stroke: 2px #1a1a1a; }
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
.wph-wave { transform-origin: 160px 205px; animation: wph-waving 1.4s ease-in-out .6s infinite; }
@keyframes wph-waving { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(10deg); } }

.wph-stamp { margin-top: 2vh; width: 72px; height: 72px; border: 2px solid var(--red); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 13px; letter-spacing: .05em; line-height: 1.15; opacity: 0; animation: wph-stamp .7s cubic-bezier(.34,1.5,.5,1) 2.2s forwards; }
@keyframes wph-stamp { from { opacity: 0; transform: scale(2) rotate(-90deg); } to { opacity: 1; transform: rotate(-8deg); } }

.wph-corner { position: absolute; top: 0; width: 88px; height: 88px; z-index: 2; background: var(--red); box-shadow: 8px 8px 0 -4px var(--cream), 12px 12px 0 -4px var(--red), 18px 18px 0 -4px var(--cream), 22px 22px 0 -4px var(--red); }
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
  .wph-root *, .wph-root *::before { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; }
}
`
