"use client"

// Booking Experience — two worlds, one flow.
//   WEB DEV  → a glass terminal: mono type, cyan/violet grid, scan-line lock-ons, pixel bursts.
//   AD STUDIO → a creative-director studio: viewfinder frames, REC light, warm film gradients, confetti.
// Flow: world → quick questions → session (free intro / paid strategy) → how we meet →
// calendar + time → details & summary → confirmed (or pay to confirm). Plus "Manage booking"
// for reschedule / cancel (free up to 24h before).
//
// Runs on demo data when NEXT_PUBLIC_BOOKING_API is not set.

import * as React from "react"

export const BOOKING_API = process.env.NEXT_PUBLIC_BOOKING_API || ""

type World = "web" | "ads"
type Q = { id: string; q: string; options: string[]; multi?: boolean }
type Session = { id: string; label: string; minutes: number; fee: number; blurb: string }
type Method = { id: string; label: string; note: string; icon: string }
type Slot = { start: string; end: string; free: boolean }
type Booking = {
  id: string; world: World; session: string; method: string; start: string; end: string; fee: number
  name: string; email: string; phone: string; notes: string; answers: Record<string, string | string[]>
  status: "confirmed" | "pending_payment" | "cancelled"; room?: string; moved?: number
}

const TZ = "Africa/Johannesburg"
const HOURS: Record<number, [number, number]> = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [9, 13] }

const WORLDS: Record<World, {
  name: string; tag: string; kicker: string; questions: Q[]; sessions: Session[]
}> = {
  web: {
    name: "Web Dev",
    tag: "Websites · Shopify stores · Fixes",
    kicker: "> booking.init({ track: 'web' })",
    questions: [
      { id: "need", q: "What are we building?", options: ["New website", "Shopify store", "Redesign", "Fix bugs / speed", "Custom feature"] },
      { id: "has", q: "Do you have a site right now?", options: ["Yes, on Shopify", "Yes, other platform", "No, starting fresh"] },
      { id: "budget", q: "Budget range", options: ["Under R5k", "R5k – R10k", "R10k – R20k", "R20k+", "Not sure yet"] },
      { id: "when", q: "When do you need it?", options: ["ASAP", "Within a month", "2–3 months", "Just exploring"] },
    ],
    sessions: [
      { id: "web-intro", label: "Intro call", minutes: 15, fee: 0, blurb: "Quick chat about your site — free." },
      { id: "web-strategy", label: "Strategy session", minutes: 60, fee: 350, blurb: "Deep dive: sitemap, features, timeline & quote. Fee comes off your package." },
    ],
  },
  ads: {
    name: "Ad Studio",
    tag: "Ads · Motion · Brand · Content",
    kicker: "REC — creative brief",
    questions: [
      { id: "need", q: "What are we creating?", options: ["Product ads", "Motion / video ads", "Logo & brand kit", "Monthly social content", "Wedding / event"] },
      { id: "platforms", q: "Where will it run?", options: ["Instagram", "TikTok", "Facebook", "YouTube", "WhatsApp status", "Print"], multi: true },
      { id: "budget", q: "Budget range", options: ["Under R2k", "R2k – R5k", "R5k – R10k", "R10k+", "Not sure yet"] },
      { id: "assets", q: "Do you have brand assets?", options: ["Yes, full brand", "Some (logo only)", "Nothing yet"] },
    ],
    sessions: [
      { id: "ads-intro", label: "Intro call", minutes: 15, fee: 0, blurb: "Tell me about your brand — free." },
      { id: "ads-strategy", label: "Creative strategy", minutes: 60, fee: 300, blurb: "Campaign ideas, moodboard & content plan. Fee comes off your package." },
    ],
  },
}

const METHODS: Method[] = [
  { id: "room", label: "Mpho Studio Room", note: "Private video room — no app, no account", icon: "◉" },
  { id: "meet", label: "Google Meet", note: "Link sent by email", icon: "▣" },
  { id: "zoom", label: "Zoom", note: "Link sent by email", icon: "▶" },
  { id: "whatsapp", label: "WhatsApp call", note: "Mpho calls your number", icon: "✆" },
  { id: "person", label: "In person", note: "Coffee or studio — Gauteng", icon: "✦" },
]

const STEPS = ["Track", "Brief", "Session", "Meet", "Time", "Confirm"]

// ---------- time helpers -------------------------------------------------------
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const sastToUtc = (y: number, m: number, d: number, h: number, min: number) => new Date(Date.UTC(y, m, d, h - 2, min))
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: TZ })
const fmtLong = (iso: string) => new Date(iso).toLocaleString("en-ZA", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ })
const rand = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x) }

function demoSlots(date: string, minutes: number, taken: Booking[]): Slot[] {
  const [y, m, d] = date.split("-").map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const hours = HOURS[dow]
  if (!hours) return []
  const out: Slot[] = []
  const soon = Date.now() + 2 * 3600e3
  for (let t = hours[0] * 60; t + minutes <= hours[1] * 60; t += 30) {
    const s = sastToUtc(y, m - 1, d, Math.floor(t / 60), t % 60)
    if (s.getTime() < soon) continue
    const e = new Date(s.getTime() + minutes * 60e3)
    const busy = rand(y * 400 + m * 31 + d + t) < 0.28 || taken.some((b) => b.status !== "cancelled" && s < new Date(b.end) && new Date(b.start) < e)
    out.push({ start: s.toISOString(), end: e.toISOString(), free: !busy })
  }
  return out
}

const roomFor = (id: string) => "https://meet.jit.si/MphoSauliStudio-" + id.replace(/[^a-z0-9]/gi, "").slice(-10)

function icsFor(b: Booking, sessionLabel: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const where = b.method === "room" ? b.room : METHODS.find((m) => m.id === b.method)?.label
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mpho Sauli//Booking//EN", "BEGIN:VEVENT",
    `UID:${b.id}@mphosauli.com`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(b.start)}`, `DTEND:${f(b.end)}`,
    `SUMMARY:${sessionLabel} with Mpho Sauli`, `LOCATION:${where}`, `DESCRIPTION:Manage your booking on mphosauli.com`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n")
}

// ---------- effects ------------------------------------------------------------
type Burst = { id: number; x: number; y: number }
function useBursts() {
  const [bursts, setBursts] = React.useState<Burst[]>([])
  const fire = React.useCallback((e: React.MouseEvent) => {
    const host = (e.currentTarget as HTMLElement).closest(".bx-root") as HTMLElement | null
    if (!host) return
    const r = host.getBoundingClientRect()
    const b = { id: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top }
    setBursts((x) => [...x, b])
    setTimeout(() => setBursts((x) => x.filter((y) => y.id !== b.id)), 900)
  }, [])
  return { bursts, fire }
}

function Bursts({ bursts, world }: { bursts: Burst[]; world: World | null }) {
  return (
    <>
      {bursts.map((b) => (
        <span key={b.id} className="bx-burst" style={{ left: b.x, top: b.y }} aria-hidden="true">
          <i className="bx-ring" />
          {Array.from({ length: 14 }).map((_, i) => (
            <i
              key={i}
              className={world === "ads" ? "bx-confetti" : "bx-pixel"}
              style={{
                ["--ang" as string]: (i / 14) * 360 + "deg",
                ["--d" as string]: 40 + rand(b.id + i) * 50 + "px",
                ["--c" as string]: world === "ads" ? ["#ff4d8d", "#ffb347", "#ffd1e3", "#b14dff"][i % 4] : ["#22d3ee", "#8a7dff", "#39ff8c"][i % 3],
              } as React.CSSProperties}
            />
          ))}
        </span>
      ))}
    </>
  )
}

// ---------- shell pieces ----------------------------------------------------------
function Panel({ world, title, children, right }: { world: World | null; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bx-panel">
      <div className="bx-bar">
        {world === "ads" ? (
          <span className="bx-rec"><i />REC</span>
        ) : (
          <span className="bx-dots"><i /><i /><i /></span>
        )}
        <span className="bx-bar-title">{title}</span>
        <span className="bx-bar-right">{right}</span>
      </div>
      <div className="bx-body">{children}</div>
      {world === "ads" ? <span className="bx-finder" aria-hidden="true"><i /><i /><i /><i /></span> : null}
    </div>
  )
}

function Chip({ on, children, onClick, sub }: { on?: boolean; children: React.ReactNode; onClick: (e: React.MouseEvent) => void; sub?: string }) {
  return (
    <button type="button" className={"bx-chip" + (on ? " is-on" : "")} onClick={onClick} aria-pressed={on}>
      <span>{children}</span>
      {sub ? <small>{sub}</small> : null}
    </button>
  )
}

// ---------- main ----------------------------------------------------------------
export default function BookingExperience() {
  const [tab, setTab] = React.useState<"book" | "manage">("book")
  const [world, setWorld] = React.useState<World | null>(null)
  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({})
  const [session, setSession] = React.useState<Session | null>(null)
  const [method, setMethod] = React.useState<string>("room")
  const [month, setMonth] = React.useState(() => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)) })
  const [date, setDate] = React.useState<string | null>(null)
  const [slot, setSlot] = React.useState<Slot | null>(null)
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", notes: "" })
  const [agree, setAgree] = React.useState(false)
  const [done, setDone] = React.useState<Booking | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [hold, setHold] = React.useState(0)
  const [mine, setMine] = React.useState<Booking[]>([])
  const [rescheduling, setRescheduling] = React.useState<Booking | null>(null)
  const { bursts, fire } = useBursts()
  const W = world ? WORLDS[world] : null

  // 15-minute payment hold countdown.
  React.useEffect(() => {
    if (!hold) return
    const t = setInterval(() => setHold((h) => Math.max(0, h - 1)), 1000)
    return () => clearInterval(t)
  }, [hold])

  const pick = (fn: () => void) => (e: React.MouseEvent) => { fire(e); fn() }
  const go = (n: number) => setStep(n)

  const chooseWorld = (w: World) => (e: React.MouseEvent) => {
    fire(e)
    setWorld(w); setAnswers({}); setSession(null); setDate(null); setSlot(null)
    setTimeout(() => setStep(1), 380)
  }

  const answered = W ? W.questions.every((q) => (q.multi ? (answers[q.id] as string[] | undefined)?.length : answers[q.id])) : false
  const minutes = session?.minutes ?? 15

  // Month grid.
  const today = new Date()
  const todayKey = ymd(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())))
  const days: { key: string; d: number; inMonth: boolean; open: number; closed: boolean; past: boolean }[] = []
  {
    const first = month.getUTCDay()
    const start = new Date(month.getTime() - first * 864e5)
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getTime() + i * 864e5)
      const key = ymd(d)
      const past = key < todayKey
      const far = d.getTime() - today.getTime() > 60 * 864e5
      const slots = past || far ? [] : demoSlots(key, minutes, mine)
      days.push({ key, d: d.getUTCDate(), inMonth: d.getUTCMonth() === month.getUTCMonth(), open: slots.filter((s) => s.free).length, closed: !HOURS[d.getUTCDay()] || far, past })
    }
  }
  const slots = date ? demoSlots(date, minutes, mine.filter((b) => b.id !== rescheduling?.id)) : []
  const morning = slots.filter((s) => +fmtTime(s.start).slice(0, 2) < 12)
  const afternoon = slots.filter((s) => +fmtTime(s.start).slice(0, 2) >= 12)

  const confirm = async (e: React.MouseEvent) => {
    fire(e)
    if (!slot || !session || !world) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 900))
    if (rescheduling) {
      const moved = { ...rescheduling, start: slot.start, end: slot.end, moved: (rescheduling.moved || 0) + 1 }
      setMine((m) => m.map((b) => (b.id === moved.id ? moved : b)))
      setDone(moved)
      setRescheduling(null)
    } else {
      const id = "MS" + Date.now().toString(36).toUpperCase()
      const b: Booking = {
        id, world, session: session.id, method, start: slot.start, end: slot.end, fee: session.fee, ...form, answers,
        status: session.fee ? "pending_payment" : "confirmed", room: method === "room" ? roomFor(id) : undefined,
      }
      setMine((m) => [b, ...m])
      setDone(b)
      if (session.fee) setHold(15 * 60)
    }
    setBusy(false)
  }

  const pay = (e: React.MouseEvent) => {
    fire(e)
    if (!done) return
    // Real build: redirect to Shopify checkout for the consultation product; webhook confirms.
    const paid = { ...done, status: "confirmed" as const }
    setMine((m) => m.map((b) => (b.id === paid.id ? paid : b)))
    setDone(paid)
    setHold(0)
  }

  const reset = () => {
    setDone(null); setStep(0); setWorld(null); setAnswers({}); setSession(null); setDate(null); setSlot(null); setAgree(false); setHold(0)
  }

  const startReschedule = (b: Booking) => {
    const w = b.world
    setWorld(w)
    setSession(WORLDS[w].sessions.find((s) => s.id === b.session) || null)
    setMethod(b.method)
    setAnswers(b.answers)
    setForm({ name: b.name, email: b.email, phone: b.phone, notes: b.notes })
    setRescheduling(b)
    setDate(null); setSlot(null); setDone(null); setAgree(true)
    setTab("book")
    setStep(4)
  }

  const cancel = (b: Booking) => {
    const late = new Date(b.start).getTime() - Date.now() < 24 * 3600e3
    if (!window.confirm(late && b.fee ? "This is within 24 hours — your fee won't be refunded. Cancel anyway?" : "Cancel this booking?")) return
    setMine((m) => m.map((x) => (x.id === b.id ? { ...x, status: "cancelled" } : x)))
  }

  const sessionLabel = (id: string) => [...WORLDS.web.sessions, ...WORLDS.ads.sessions].find((s) => s.id === id)?.label || id

  // ---------- render ----------
  return (
    <div className={"bx-root" + (world ? " bx-" + world : "")}>
      <style>{CSS}</style>
      <div className="bx-bg" aria-hidden="true">
        <div className="bx-grid" />
        <div className="bx-glow bx-g1" /><div className="bx-glow bx-g2" /><div className="bx-glow bx-g3" />
        <div className="bx-film" />
      </div>
      <Bursts bursts={bursts} world={world} />

      <div className="bx-wrap">
        <header className="bx-head">
          <p className="bx-kicker">{W ? W.kicker : "MPHO SAULI · BOOKINGS"}</p>
          <h1 className="bx-title">
            {world === "web" ? <>Let&apos;s build <em>your site</em></> : world === "ads" ? <>Let&apos;s create <em>your campaign</em></> : <>Book a <em>session</em></>}
          </h1>
          <div className="bx-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "book"} className={tab === "book" ? "is-on" : ""} onClick={() => setTab("book")}>Book</button>
            <button role="tab" aria-selected={tab === "manage"} className={tab === "manage" ? "is-on" : ""} onClick={() => setTab("manage")}>
              Manage booking{mine.filter((b) => b.status !== "cancelled").length ? <b>{mine.filter((b) => b.status !== "cancelled").length}</b> : null}
            </button>
          </div>
        </header>

        {tab === "manage" ? (
          <Panel world={world} title="manage_bookings">
            {mine.length === 0 ? (
              <div className="bx-empty">
                <p>No bookings on this device yet.</p>
                <p className="bx-muted">In the live version you&apos;ll enter your email, get a 6-digit code, and see every booking you&apos;ve made.</p>
                <button className="bx-cta" onClick={() => setTab("book")}>Book a session</button>
              </div>
            ) : (
              <div className="bx-list">
                {mine.map((b) => {
                  const hrs = (new Date(b.start).getTime() - Date.now()) / 3600e3
                  const canMove = b.status !== "cancelled" && hrs > 0 && (hrs > 24 || !(b.moved && b.moved >= 1))
                  return (
                    <div key={b.id} className={"bx-item" + (b.status === "cancelled" ? " is-off" : "")}>
                      <div className="bx-item-tag">{b.world === "web" ? "WEB" : "ADS"}</div>
                      <div className="bx-item-main">
                        <strong>{sessionLabel(b.session)}</strong>
                        <span>{fmtLong(b.start)} · {METHODS.find((m) => m.id === b.method)?.label}</span>
                        <small>#{b.id} · {b.fee ? "R" + b.fee : "Free"} · {b.status === "pending_payment" ? "awaiting payment" : b.status}{b.moved ? ` · moved ${b.moved}×` : ""}</small>
                      </div>
                      {b.status !== "cancelled" ? (
                        <div className="bx-item-actions">
                          {b.room ? <a href={b.room} target="_blank" rel="noreferrer" className="bx-mini">Join room</a> : null}
                          <button className="bx-mini" disabled={!canMove} onClick={() => startReschedule(b)} title={canMove ? "" : "Within 24h you can move once"}>Reschedule</button>
                          <button className="bx-mini bx-danger" onClick={() => cancel(b)}>Cancel</button>
                        </div>
                      ) : <span className="bx-muted">Cancelled</span>}
                    </div>
                  )
                })}
                <p className="bx-muted bx-policy">Free to reschedule or cancel up to 24 hours before. Inside 24 hours you can move once; paid fees aren&apos;t refunded.</p>
              </div>
            )}
          </Panel>
        ) : done ? (
          <Panel world={world} title={done.status === "pending_payment" ? "payment_required" : "booking_confirmed"}>
            <div className="bx-done">
              <div className={"bx-seal" + (done.status === "pending_payment" ? " is-wait" : "")}>{done.status === "pending_payment" ? "R" + done.fee : "✓"}</div>
              {done.status === "pending_payment" ? (
                <>
                  <h2>Your slot is held</h2>
                  <p className="bx-muted">Pay the R{done.fee} {sessionLabel(done.session).toLowerCase()} fee to lock <strong>{fmtLong(done.start)}</strong>. It comes off your package if you hire Mpho.</p>
                  <div className="bx-timer"><span>{pad(Math.floor(hold / 60))}</span>:<span>{pad(hold % 60)}</span></div>
                  <button className="bx-cta" onClick={pay}>Pay R{done.fee} &amp; confirm</button>
                  <p className="bx-muted bx-small">Secure checkout through Shopify. If you don&apos;t pay within 15 minutes the slot is released.</p>
                </>
              ) : (
                <>
                  <h2>{rescheduling ? "Moved!" : "You're booked!"}</h2>
                  <p className="bx-muted">{sessionLabel(done.session)} · <strong>{fmtLong(done.start)}</strong> (SAST)</p>
                  <p className="bx-muted">{METHODS.find((m) => m.id === done.method)?.label}{done.room ? " — your private room is ready" : ""}</p>
                  <div className="bx-row">
                    {done.room ? <a className="bx-cta" href={done.room} target="_blank" rel="noreferrer">Open my room</a> : null}
                    <a className="bx-ghost" download="mpho-sauli-booking.ics" href={"data:text/calendar;charset=utf-8," + encodeURIComponent(icsFor(done, sessionLabel(done.session)))}>Add to calendar</a>
                    <button className="bx-ghost" onClick={() => setTab("manage")}>Manage</button>
                  </div>
                  <p className="bx-muted bx-small">Booking #{done.id}. A confirmation email is on its way to {done.email}.</p>
                  <button className="bx-link" onClick={reset}>Book something else</button>
                </>
              )}
            </div>
          </Panel>
        ) : (
          <>
            {/* stepper */}
            <ol className="bx-steps">
              {STEPS.map((s, i) => (
                <li key={s} className={(i === step ? "is-now " : "") + (i < step ? "is-done" : "")}>
                  <button disabled={i > step || (rescheduling !== null && i < 4)} onClick={() => go(i)}>
                    <span>{i < step ? "✓" : i + 1}</span>{s}
                  </button>
                </li>
              ))}
            </ol>

            <div className="bx-stage" key={step + (world || "")}>
              {step === 0 && (
                <div className="bx-worlds">
                  <button className="bx-world bx-world-web" onClick={chooseWorld("web")}>
                    <span className="bx-world-code" aria-hidden="true">{"<site>\n  <store/>\n  <fix/>\n</site>"}</span>
                    <span className="bx-world-k">01 / WEB DEV</span>
                    <strong>Websites &amp; Shopify</strong>
                    <span className="bx-muted">New builds, redesigns, Shopify stores and bug fixes.</span>
                    <span className="bx-world-go">Enter the lab →</span>
                  </button>
                  <button className="bx-world bx-world-ads" onClick={chooseWorld("ads")}>
                    <span className="bx-world-frames" aria-hidden="true"><i /><i /><i /></span>
                    <span className="bx-world-k">02 / AD STUDIO</span>
                    <strong>Ads, Brand &amp; Content</strong>
                    <span className="bx-muted">Product ads, motion video, brand kits, social content, weddings.</span>
                    <span className="bx-world-go">Enter the studio →</span>
                  </button>
                </div>
              )}

              {step === 1 && W && (
                <Panel world={world} title={world === "web" ? "project_brief.json" : "Creative brief"} right={<button className="bx-link" onClick={() => go(0)}>switch track</button>}>
                  <div className="bx-qs">
                    {W.questions.map((q, qi) => (
                      <div key={q.id} className="bx-q" style={{ animationDelay: qi * 90 + "ms" }}>
                        <p>{world === "web" ? <code>{qi + 1}.</code> : <em>{pad(qi + 1)}</em>} {q.q}{q.multi ? <small> — pick all that apply</small> : null}</p>
                        <div className="bx-chips">
                          {q.options.map((o) => {
                            const cur = answers[q.id]
                            const on = q.multi ? ((cur as string[]) || []).includes(o) : cur === o
                            return (
                              <Chip key={o} on={on} onClick={pick(() => setAnswers((a) => {
                                if (!q.multi) return { ...a, [q.id]: o }
                                const list = (a[q.id] as string[]) || []
                                return { ...a, [q.id]: on ? list.filter((x) => x !== o) : [...list, o] }
                              }))}>{o}</Chip>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bx-nav"><span className="bx-muted">{Object.keys(answers).length}/{W.questions.length} answered</span><button className="bx-cta" disabled={!answered} onClick={(e) => { fire(e); go(2) }}>Next</button></div>
                </Panel>
              )}

              {step === 2 && W && (
                <Panel world={world} title={world === "web" ? "select_session()" : "Choose your session"}>
                  <div className="bx-cards">
                    {W.sessions.map((s) => (
                      <button key={s.id} className={"bx-card" + (session?.id === s.id ? " is-on" : "")} onClick={pick(() => setSession(s))}>
                        <span className="bx-card-min">{s.minutes} min</span>
                        <strong>{s.label}</strong>
                        <span className="bx-price">{s.fee ? "R" + s.fee : "FREE"}</span>
                        <span className="bx-muted">{s.blurb}</span>
                      </button>
                    ))}
                  </div>
                  <div className="bx-nav"><button className="bx-link" onClick={() => go(1)}>← Back</button><button className="bx-cta" disabled={!session} onClick={(e) => { fire(e); go(3) }}>Next</button></div>
                </Panel>
              )}

              {step === 3 && (
                <Panel world={world} title={world === "web" ? "connect --method" : "How we meet"}>
                  <div className="bx-methods">
                    {METHODS.map((m) => (
                      <button key={m.id} className={"bx-method" + (method === m.id ? " is-on" : "")} onClick={pick(() => setMethod(m.id))}>
                        <span className="bx-method-i">{m.icon}</span>
                        <strong>{m.label}</strong>
                        <span className="bx-muted">{m.note}</span>
                        {m.id === "room" ? <span className="bx-badge">Mpho&apos;s own</span> : null}
                      </button>
                    ))}
                  </div>
                  <div className="bx-nav"><button className="bx-link" onClick={() => go(2)}>← Back</button><button className="bx-cta" onClick={(e) => { fire(e); go(4) }}>Next</button></div>
                </Panel>
              )}

              {step === 4 && (
                <Panel world={world} title={rescheduling ? "reschedule #" + rescheduling.id : world === "web" ? "calendar.schedule()" : "Pick your shoot day"} right={<span className="bx-muted">SAST · {minutes} min</span>}>
                  <div className="bx-cal-wrap">
                    <div className="bx-cal">
                      <div className="bx-cal-head">
                        <button className="bx-mini" onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))} disabled={month <= new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))}>‹</button>
                        <strong>{month.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" })}</strong>
                        <button className="bx-mini" onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))}>›</button>
                      </div>
                      <div className="bx-dow">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
                      <div className="bx-days">
                        {days.map((d, i) => {
                          const off = !d.inMonth || d.past || d.closed || d.open === 0
                          return (
                            <button
                              key={d.key}
                              disabled={off}
                              className={"bx-day" + (date === d.key ? " is-on" : "") + (!d.inMonth ? " is-out" : "") + (d.key === todayKey ? " is-today" : "")}
                              style={{ animationDelay: i * 12 + "ms", ["--load" as string]: Math.min(1, d.open / 14) } as React.CSSProperties}
                              onClick={pick(() => { setDate(d.key); setSlot(null) })}
                            >
                              <span>{d.d}</span>
                              {!off ? <i className="bx-day-bar" /> : null}
                            </button>
                          )
                        })}
                      </div>
                      <p className="bx-legend"><i /> more open <i className="lo" /> filling up</p>
                    </div>
                    <div className="bx-times">
                      {!date ? (
                        <div className="bx-empty bx-muted">{world === "web" ? "// select a date to load slots" : "Pick a day to see open times"}</div>
                      ) : (
                        <>
                          <p className="bx-times-day">{new Date(date + "T12:00:00Z").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
                          {[["Morning", morning], ["Afternoon", afternoon]].map(([label, list]) =>
                            (list as Slot[]).length ? (
                              <div key={label as string} className="bx-slotgroup">
                                <small>{label as string}</small>
                                <div className="bx-slots">
                                  {(list as Slot[]).map((s, i) => (
                                    <button key={s.start} disabled={!s.free} style={{ animationDelay: i * 30 + "ms" }} className={"bx-slot" + (slot?.start === s.start ? " is-on" : "")} onClick={pick(() => setSlot(s))}>
                                      {fmtTime(s.start)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null,
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bx-nav">
                    <button className="bx-link" onClick={() => (rescheduling ? (setRescheduling(null), setTab("manage"), setStep(0)) : go(3))}>{rescheduling ? "Cancel reschedule" : "← Back"}</button>
                    {rescheduling ? (
                      <button className="bx-cta" disabled={!slot || busy} onClick={confirm}>{busy ? "Moving…" : "Move booking"}</button>
                    ) : (
                      <button className="bx-cta" disabled={!slot} onClick={(e) => { fire(e); go(5) }}>Next</button>
                    )}
                  </div>
                </Panel>
              )}

              {step === 5 && W && session && slot && (
                <div className="bx-confirm">
                  <Panel world={world} title={world === "web" ? "your_details" : "Your details"}>
                    <div className="bx-form">
                      <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      <input placeholder={method === "whatsapp" ? "WhatsApp number (required)" : "WhatsApp number (optional)"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      <textarea rows={3} placeholder={world === "web" ? "Links, current site, anything I should look at before the call…" : "Your brand, inspo accounts, links…"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      <label className="bx-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Free to reschedule or cancel up to 24h before.{session.fee ? " Paid fees aren't refunded inside 24h." : ""}</label>
                    </div>
                  </Panel>
                  <Panel world={world} title={world === "web" ? "summary.log" : "Call sheet"}>
                    <dl className="bx-sum">
                      <div><dt>Track</dt><dd>{W.name}</dd></div>
                      <div><dt>Session</dt><dd>{session.label} · {session.minutes} min</dd></div>
                      <div><dt>When</dt><dd>{fmtLong(slot.start)}</dd></div>
                      <div><dt>Where</dt><dd>{METHODS.find((m) => m.id === method)?.label}</dd></div>
                      {W.questions.map((q) => <div key={q.id}><dt>{q.q.replace("?", "")}</dt><dd>{Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : (answers[q.id] as string)}</dd></div>)}
                      <div className="bx-sum-total"><dt>Due now</dt><dd>{session.fee ? "R" + session.fee : "R0 — free"}</dd></div>
                    </dl>
                    <button
                      className="bx-cta bx-cta-big"
                      disabled={busy || !form.name || !/^\S+@\S+\.\S+$/.test(form.email) || !agree || (method === "whatsapp" && !form.phone)}
                      onClick={confirm}
                    >
                      {busy ? "Locking it in…" : session.fee ? `Hold slot & pay R${session.fee}` : "Confirm booking"}
                    </button>
                    <button className="bx-link" onClick={() => go(4)}>← Change time</button>
                  </Panel>
                </div>
              )}
            </div>
          </>
        )}
        {!BOOKING_API ? <p className="bx-demo">Demo mode · bookings are not saved yet</p> : null}
      </div>
    </div>
  )
}

const CSS = `
.bx-root {
  --a: #ff4d8d; --b: #8a7dff; --c: #22d3ee; --ink: #f4f4f6; --mut: rgba(244,244,246,.6);
  --panel: rgba(255,255,255,.06); --rim: rgba(255,255,255,.16); --font: inherit; --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  position: relative; min-height: 100svh; overflow: hidden; color: var(--ink); background: #050507; isolation: isolate;
  transition: background .8s ease;
}
.bx-root.bx-web { --a: #22d3ee; --b: #8a7dff; --c: #39ff8c; --font: var(--mono); background: #03060b; }
.bx-root.bx-ads { --a: #ff4d8d; --b: #ffb347; --c: #b14dff; background: #0b0507; }
.bx-wrap { position: relative; z-index: 2; max-width: 1120px; margin: 0 auto; padding: 72px 16px 60px; }
.bx-muted { color: var(--mut); }
.bx-small { font-size: 12px; }

/* backgrounds per world */
.bx-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.bx-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .45; transition: background 1s ease, transform 1.2s ease; animation: bx-float 16s ease-in-out infinite alternate; }
.bx-g1 { width: 520px; height: 520px; left: -10%; top: 2%; background: var(--a); }
.bx-g2 { width: 460px; height: 460px; right: -8%; top: 30%; background: var(--b); animation-delay: -5s; }
.bx-g3 { width: 380px; height: 380px; left: 35%; bottom: -14%; background: var(--c); opacity: .25; animation-delay: -10s; }
@keyframes bx-float { to { transform: translate(50px,-40px) scale(1.1); } }
.bx-grid { position: absolute; inset: -50% -10% 0; opacity: 0; transition: opacity .8s ease;
  background-image: linear-gradient(rgba(34,211,238,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.12) 1px, transparent 1px);
  background-size: 44px 44px; transform: perspective(700px) rotateX(58deg); transform-origin: 50% 100%; animation: bx-gridmove 6s linear infinite; mask-image: linear-gradient(transparent, #000 60%); }
@keyframes bx-gridmove { to { background-position: 0 44px, 0 0; } }
.bx-web .bx-grid { opacity: 1; }
.bx-film { position: absolute; inset: 0; opacity: 0; transition: opacity .8s; background: repeating-linear-gradient(90deg, transparent 0 22px, rgba(255,255,255,.035) 22px 24px), radial-gradient(120% 80% at 50% 0%, rgba(255,179,71,.12), transparent 60%); }
.bx-ads .bx-film { opacity: 1; }

/* header */
.bx-head { text-align: center; margin-bottom: 28px; }
.bx-kicker { font-family: var(--mono); font-size: 12px; letter-spacing: .25em; color: var(--a); text-transform: uppercase; min-height: 18px; }
.bx-web .bx-kicker { letter-spacing: .05em; text-transform: none; }
.bx-web .bx-kicker::after { content: "▍"; animation: bx-blink 1s steps(1) infinite; margin-left: 4px; }
@keyframes bx-blink { 50% { opacity: 0; } }
.bx-ads .bx-kicker::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ff3b3b; margin-right: 8px; animation: bx-blink 1.2s steps(1) infinite; vertical-align: 1px; }
.bx-title { font-size: clamp(36px, 6vw, 72px); font-weight: 900; letter-spacing: -.03em; margin: 12px 0 22px; line-height: 1; }
.bx-web .bx-title { font-family: var(--mono); letter-spacing: -.04em; }
.bx-ads .bx-title { font-family: "Oswald", "Arial Narrow", sans-serif; text-transform: uppercase; letter-spacing: .01em; }
.bx-title em { font-style: normal; background: linear-gradient(90deg, var(--a), var(--b), var(--c), var(--a)); background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: bx-pan 6s linear infinite; }
@keyframes bx-pan { to { background-position: 300% 0; } }
.bx-tabs { display: inline-flex; padding: 5px; border-radius: 999px; background: var(--panel); border: 1px solid var(--rim); backdrop-filter: blur(20px); }
.bx-tabs button { padding: 9px 18px; border-radius: 999px; font-weight: 600; font-size: 14px; color: var(--mut); display: inline-flex; gap: 6px; align-items: center; }
.bx-tabs button.is-on { background: #fff; color: #000; }
.bx-tabs b { background: var(--a); color: #000; border-radius: 99px; font-size: 11px; padding: 1px 7px; }

/* stepper */
.bx-steps { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin: 0 0 22px; padding: 0; list-style: none; }
.bx-steps button { display: flex; align-items: center; gap: 8px; padding: 7px 12px 7px 7px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--mut); border: 1px solid transparent; transition: all .3s; font-family: var(--font); }
.bx-steps span { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; background: rgba(255,255,255,.08); }
.bx-steps .is-now button { color: var(--ink); border-color: var(--rim); background: var(--panel); }
.bx-steps .is-now span { background: linear-gradient(135deg, var(--a), var(--b)); color: #000; box-shadow: 0 0 18px var(--a); }
.bx-steps .is-done span { background: rgba(255,255,255,.9); color: #000; }
.bx-steps button:disabled { opacity: .45; cursor: default; }
.bx-stage { animation: bx-in .55s cubic-bezier(.2,.8,.2,1) both; }
@keyframes bx-in { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(8px); } }

/* glass panel */
.bx-panel { position: relative; border-radius: 26px; background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); border: 1px solid var(--rim);
  backdrop-filter: blur(24px) saturate(1.6); -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 40px 80px -40px rgba(0,0,0,.9); overflow: hidden; }
.bx-panel::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, rgba(255,255,255,.12) 0%, transparent 28%); }
.bx-web .bx-panel { border-radius: 16px; box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 0 0 1px rgba(34,211,238,.08), 0 30px 80px -30px rgba(34,211,238,.25); }
.bx-web .bx-panel::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.018) 3px 4px); }
.bx-ads .bx-panel { border-radius: 30px; box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 30px 80px -30px rgba(255,77,141,.35); }
.bx-bar { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,.08); font-size: 12px; }
.bx-bar-title { font-family: var(--mono); color: var(--mut); letter-spacing: .04em; }
.bx-ads .bx-bar-title { font-family: inherit; text-transform: uppercase; letter-spacing: .2em; font-weight: 700; }
.bx-bar-right { margin-left: auto; }
.bx-dots { display: flex; gap: 6px; } .bx-dots i { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; } .bx-dots i:nth-child(2) { background: #febc2e; } .bx-dots i:nth-child(3) { background: #28c840; }
.bx-rec { display: flex; align-items: center; gap: 6px; color: #ff6b6b; font-weight: 800; letter-spacing: .15em; }
.bx-rec i { width: 8px; height: 8px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 10px #ff3b3b; animation: bx-blink 1.2s steps(1) infinite; }
.bx-body { position: relative; z-index: 1; padding: 24px; }
.bx-finder i { position: absolute; width: 22px; height: 22px; border: 2px solid rgba(255,255,255,.55); z-index: 2; pointer-events: none; }
.bx-finder i:nth-child(1) { top: 52px; left: 12px; border-right: 0; border-bottom: 0; } .bx-finder i:nth-child(2) { top: 52px; right: 12px; border-left: 0; border-bottom: 0; }
.bx-finder i:nth-child(3) { bottom: 12px; left: 12px; border-right: 0; border-top: 0; } .bx-finder i:nth-child(4) { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

/* worlds */
.bx-worlds { display: grid; gap: 20px; grid-template-columns: 1fr 1fr; }
@media (max-width: 760px) { .bx-worlds { grid-template-columns: 1fr; } }
.bx-world { position: relative; text-align: left; min-height: 340px; padding: 30px; border-radius: 28px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px;
  border: 1px solid var(--rim); backdrop-filter: blur(24px); transition: transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .5s, border-color .4s; }
.bx-world:hover { transform: translateY(-8px) rotateX(3deg); }
.bx-world strong { font-size: 30px; font-weight: 900; letter-spacing: -.02em; }
.bx-world-k { font-family: var(--mono); font-size: 12px; letter-spacing: .2em; }
.bx-world-go { margin-top: 10px; font-weight: 700; }
.bx-world-web { background: linear-gradient(160deg, rgba(34,211,238,.18), rgba(138,125,255,.08) 50%, rgba(255,255,255,.03)), #03060b; font-family: var(--mono); }
.bx-world-web strong { font-family: var(--mono); }
.bx-world-web .bx-world-k, .bx-world-web .bx-world-go { color: #22d3ee; }
.bx-world-web:hover { box-shadow: 0 30px 80px -20px rgba(34,211,238,.5); border-color: rgba(34,211,238,.6); }
.bx-world-code { position: absolute; top: 26px; left: 30px; white-space: pre; font-family: var(--mono); font-size: 15px; line-height: 1.6; color: rgba(34,211,238,.55); text-shadow: 0 0 12px rgba(34,211,238,.6); }
.bx-world-web::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent 0 48%, rgba(34,211,238,.25) 50%, transparent 52%); background-size: 100% 200%; animation: bx-scan 3.2s linear infinite; pointer-events: none; }
@keyframes bx-scan { from { background-position: 0 -100%; } to { background-position: 0 100%; } }
.bx-world-ads { background: linear-gradient(160deg, rgba(255,77,141,.28), rgba(255,179,71,.16) 55%, rgba(177,77,255,.12)), #0b0507; }
.bx-world-ads strong { font-family: "Oswald", "Arial Narrow", sans-serif; text-transform: uppercase; font-size: 36px; }
.bx-world-ads .bx-world-k, .bx-world-ads .bx-world-go { color: #ffb347; }
.bx-world-ads:hover { box-shadow: 0 30px 80px -20px rgba(255,77,141,.55); border-color: rgba(255,77,141,.6); }
.bx-world-frames { position: absolute; top: 24px; left: 30px; right: 30px; display: flex; gap: 12px; }
.bx-world-frames i { flex: 1; height: 120px; border-radius: 16px; background: linear-gradient(160deg, rgba(255,255,255,.18), rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.2); transform: rotate(-4deg); transition: transform .6s; }
.bx-world-frames i:nth-child(2) { transform: translateY(14px) rotate(2deg); background: linear-gradient(160deg, rgba(255,77,141,.5), rgba(255,179,71,.3)); }
.bx-world-frames i:nth-child(3) { transform: rotate(5deg); }
.bx-world-ads:hover .bx-world-frames i { transform: translateY(-6px) rotate(0); }

/* questions */
.bx-qs { display: grid; gap: 22px; }
.bx-q { animation: bx-in .5s both; }
.bx-q p { margin: 0 0 10px; font-weight: 700; font-size: 16px; }
.bx-q code { color: var(--a); font-family: var(--mono); margin-right: 6px; }
.bx-q em { font-style: normal; color: var(--a); font-family: "Oswald", sans-serif; margin-right: 8px; }
.bx-q small { color: var(--mut); font-weight: 400; }
.bx-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.bx-chip { padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.04); font-size: 14px; font-weight: 600; color: rgba(255,255,255,.85); transition: all .25s cubic-bezier(.2,.8,.2,1); font-family: var(--font); }
.bx-web .bx-chip { border-radius: 8px; }
.bx-ads .bx-chip { border-radius: 14px; }
.bx-chip:hover { border-color: var(--a); transform: translateY(-2px); }
.bx-chip.is-on { background: linear-gradient(135deg, var(--a), var(--b)); color: #05050a; border-color: transparent; box-shadow: 0 0 24px -4px var(--a); transform: scale(1.04); }
.bx-web .bx-chip.is-on::before { content: "✓ "; }
.bx-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; gap: 12px; }

/* buttons */
.bx-cta { display: inline-flex; align-items: center; justify-content: center; padding: 13px 26px; border-radius: 999px; font-weight: 800; color: #05050a; background: linear-gradient(135deg, #fff, #ffe3ef); box-shadow: 0 10px 30px -10px var(--a); transition: transform .25s, box-shadow .25s, opacity .25s; font-family: var(--font); }
.bx-cta:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 40px -10px var(--a); }
.bx-cta:disabled { opacity: .35; cursor: not-allowed; }
.bx-cta-big { width: 100%; margin-top: 18px; padding: 16px; font-size: 16px; }
.bx-web .bx-cta { border-radius: 10px; background: linear-gradient(135deg, #22d3ee, #8a7dff); }
.bx-ads .bx-cta { background: linear-gradient(135deg, #ff4d8d, #ffb347); }
.bx-ghost { padding: 12px 20px; border-radius: 999px; border: 1px solid var(--rim); background: var(--panel); font-weight: 700; }
.bx-link { color: var(--mut); font-size: 13px; font-weight: 600; } .bx-link:hover { color: var(--ink); }
.bx-mini { padding: 7px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); font-size: 12px; font-weight: 700; }
.bx-mini:disabled { opacity: .3; }
.bx-danger:hover { border-color: #ff5f57; color: #ff8f8a; }

/* session cards + methods */
.bx-cards { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
@media (max-width: 680px) { .bx-cards { grid-template-columns: 1fr; } }
.bx-card { position: relative; text-align: left; padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); display: flex; flex-direction: column; gap: 6px; transition: all .35s cubic-bezier(.2,.8,.2,1); }
.bx-card strong { font-size: 22px; }
.bx-card-min { font-family: var(--mono); font-size: 12px; color: var(--a); }
.bx-price { font-size: 40px; font-weight: 900; letter-spacing: -.03em; background: linear-gradient(180deg, #fff, #c9c9d6); -webkit-background-clip: text; background-clip: text; color: transparent; }
.bx-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,.3); }
.bx-card.is-on { border-color: var(--a); box-shadow: 0 0 0 1px var(--a), 0 20px 60px -20px var(--a); background: linear-gradient(160deg, color-mix(in srgb, var(--a) 18%, transparent), rgba(255,255,255,.03)); }
.bx-methods { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
.bx-method { position: relative; text-align: left; padding: 18px; border-radius: 18px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); display: flex; flex-direction: column; gap: 4px; transition: all .3s; }
.bx-method:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.3); }
.bx-method.is-on { border-color: var(--a); box-shadow: 0 0 0 1px var(--a), 0 16px 40px -16px var(--a); }
.bx-method-i { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; background: linear-gradient(135deg, var(--a), var(--b)); color: #05050a; margin-bottom: 6px; }
.bx-method .bx-muted { font-size: 12px; }
.bx-badge { position: absolute; top: 14px; right: 14px; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border-radius: 99px; background: var(--a); color: #05050a; }

/* calendar */
.bx-cal-wrap { display: grid; gap: 24px; grid-template-columns: 1.1fr 1fr; }
@media (max-width: 820px) { .bx-cal-wrap { grid-template-columns: 1fr; } }
.bx-cal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.bx-cal-head strong { font-size: 18px; }
.bx-web .bx-cal-head strong { font-family: var(--mono); }
.bx-ads .bx-cal-head strong { font-family: "Oswald", sans-serif; text-transform: uppercase; letter-spacing: .08em; }
.bx-dow, .bx-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.bx-dow span { text-align: center; font-size: 11px; color: var(--mut); font-family: var(--mono); padding-bottom: 6px; }
.bx-day { position: relative; aspect-ratio: 1; border-radius: 12px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); font-weight: 700; font-size: 15px; overflow: hidden;
  transition: transform .25s cubic-bezier(.2,.8,.2,1), border-color .25s, background .25s; animation: bx-pop .45s cubic-bezier(.2,.8,.2,1) both; }
.bx-web .bx-day { border-radius: 6px; font-family: var(--mono); }
.bx-day span { position: relative; z-index: 1; }
.bx-day:disabled { opacity: .22; background: transparent; cursor: default; }
.bx-day.is-out { visibility: hidden; }
.bx-day:not(:disabled):hover { transform: translateY(-3px) scale(1.06); border-color: var(--a); background: rgba(255,255,255,.1); }
.bx-day.is-today::after { content: ""; position: absolute; top: 6px; right: 6px; width: 5px; height: 5px; border-radius: 50%; background: var(--a); }
.bx-day-bar { position: absolute; left: 18%; right: 18%; bottom: 7px; height: 3px; border-radius: 3px; background: linear-gradient(90deg, var(--a) calc(var(--load) * 100%), rgba(255,255,255,.15) 0); }
.bx-day.is-on { background: linear-gradient(135deg, var(--a), var(--b)); color: #05050a; border-color: transparent; transform: scale(1.08); box-shadow: 0 0 30px -4px var(--a); }
.bx-web .bx-day.is-on { animation: bx-lock .5s ease both; }
.bx-web .bx-day.is-on::before { content: ""; position: absolute; inset: -2px; border: 1px solid #fff; border-radius: 8px; animation: bx-target .6s ease-out both; }
@keyframes bx-target { from { inset: -14px; opacity: 0; } to { inset: -2px; opacity: 1; } }
@keyframes bx-lock { 0% { filter: hue-rotate(90deg) brightness(2); } 30% { transform: scale(1.12) skewX(-6deg); } 100% { transform: scale(1.08); } }
.bx-ads .bx-day.is-on { animation: bx-flash .5s ease both; }
@keyframes bx-flash { 0% { box-shadow: 0 0 0 100px rgba(255,255,255,.9); } 100% { box-shadow: 0 0 30px -4px var(--a); } }
.bx-day.is-on .bx-day-bar { background: rgba(0,0,0,.4); }
@keyframes bx-pop { from { opacity: 0; transform: scale(.6) translateY(8px); } }
.bx-legend { display: flex; gap: 8px; align-items: center; margin-top: 12px; font-size: 11px; color: var(--mut); }
.bx-legend i { width: 16px; height: 3px; border-radius: 3px; background: var(--a); } .bx-legend i.lo { background: rgba(255,255,255,.2); margin-left: 8px; }
.bx-times { border-left: 1px solid rgba(255,255,255,.08); padding-left: 24px; min-height: 280px; }
@media (max-width: 820px) { .bx-times { border-left: 0; padding-left: 0; } }
.bx-times-day { font-weight: 800; font-size: 18px; margin: 4px 0 14px; }
.bx-slotgroup small { display: block; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--mut); margin: 10px 0 8px; font-family: var(--mono); }
.bx-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.bx-slot { padding: 11px 0; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); font-weight: 700; font-size: 14px; animation: bx-pop .4s both; transition: all .2s; font-family: var(--font); }
.bx-web .bx-slot { border-radius: 6px; }
.bx-slot:hover:not(:disabled) { border-color: var(--a); transform: translateY(-2px); }
.bx-slot:disabled { opacity: .25; text-decoration: line-through; cursor: not-allowed; }
.bx-slot.is-on { background: linear-gradient(135deg, var(--a), var(--b)); color: #05050a; border-color: transparent; box-shadow: 0 0 26px -4px var(--a); transform: scale(1.06); }
.bx-empty { display: grid; place-items: center; text-align: center; gap: 10px; min-height: 240px; padding: 20px; }

/* confirm */
.bx-confirm { display: grid; gap: 20px; grid-template-columns: 1fr 1fr; }
@media (max-width: 820px) { .bx-confirm { grid-template-columns: 1fr; } }
.bx-form { display: grid; gap: 12px; }
.bx-form input:not([type=checkbox]), .bx-form textarea { width: 100%; padding: 13px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: var(--ink); outline: none; font-family: inherit; transition: border-color .2s, box-shadow .2s; }
.bx-form input:focus, .bx-form textarea:focus { border-color: var(--a); box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 18%, transparent); }
.bx-agree { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--mut); }
.bx-agree input { margin-top: 3px; accent-color: var(--a); }
.bx-sum { display: grid; gap: 2px; margin: 0; }
.bx-sum > div { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px dashed rgba(255,255,255,.1); font-size: 14px; }
.bx-sum dt { color: var(--mut); } .bx-sum dd { margin: 0; text-align: right; font-weight: 700; }
.bx-web .bx-sum { font-family: var(--mono); font-size: 13px; }
.bx-sum-total { border-bottom: 0 !important; padding-top: 14px !important; font-size: 18px !important; }
.bx-sum-total dd { color: var(--a); font-size: 22px; }

/* done */
.bx-done { display: grid; justify-items: center; text-align: center; gap: 12px; padding: 20px 0; }
.bx-done h2 { font-size: 34px; font-weight: 900; margin: 6px 0 0; }
.bx-seal { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; font-size: 40px; font-weight: 900; color: #05050a; background: linear-gradient(135deg, var(--a), var(--b)); box-shadow: 0 0 0 10px color-mix(in srgb, var(--a) 15%, transparent), 0 0 60px var(--a); animation: bx-seal .8s cubic-bezier(.34,1.56,.64,1) both; }
.bx-seal.is-wait { font-size: 26px; }
@keyframes bx-seal { from { transform: scale(0) rotate(-120deg); } }
.bx-timer { font-family: var(--mono); font-size: 44px; font-weight: 800; letter-spacing: .05em; color: var(--a); text-shadow: 0 0 20px var(--a); }
.bx-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 8px 0; }

/* manage */
.bx-list { display: grid; gap: 10px; }
.bx-item { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); }
.bx-item.is-off { opacity: .45; }
.bx-item-tag { font-family: var(--mono); font-size: 11px; font-weight: 800; padding: 6px 8px; border-radius: 8px; background: linear-gradient(135deg, var(--a), var(--b)); color: #05050a; }
.bx-item-main { display: grid; flex: 1; min-width: 200px; } .bx-item-main span { color: var(--mut); font-size: 14px; } .bx-item-main small { color: var(--mut); font-size: 11px; font-family: var(--mono); }
.bx-item-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.bx-policy { font-size: 12px; margin-top: 8px; }
.bx-demo { text-align: center; margin-top: 24px; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--a); opacity: .7; font-family: var(--mono); }

/* click effects */
.bx-burst { position: absolute; z-index: 50; pointer-events: none; }
.bx-ring { position: absolute; left: -4px; top: -4px; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--a); animation: bx-ring .7s ease-out forwards; }
@keyframes bx-ring { to { transform: scale(14); opacity: 0; } }
.bx-pixel, .bx-confetti { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; background: var(--c); animation: bx-fly .8s cubic-bezier(.2,.8,.2,1) forwards; }
.bx-pixel { box-shadow: 0 0 8px var(--c); }
.bx-confetti { width: 7px; height: 11px; border-radius: 2px; }
@keyframes bx-fly { to { transform: rotate(var(--ang)) translateY(calc(var(--d) * -1)) rotate(180deg); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .bx-root *, .bx-root *::before, .bx-root *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  .bx-burst { display: none; }
}
`
