"use client"

import * as React from "react"
import BookingHeatmap3D, { type HeatCell } from "@/components/ui/booking-heatmap-3d"

/** Base URL of the nalea-customer-api server (bookings live under /mpho). Empty = demo data. */
export const BOOKING_API = process.env.NEXT_PUBLIC_BOOKING_API || ""

type Service = { id: string; label: string; minutes: number }
type Slot = { start: string; end: string; free: boolean }
type Day = { date: string; open: boolean; booked: number; slots: Slot[] }
type Booking = { id: string; service: string; start: string; end: string; name: string; email: string; phone: string; notes: string; status: string }
type Stats = { total: number; upcoming: number; completed: number; cancelled: number; busiest: { day: string; count: number } | null }

const TZ = "Africa/Johannesburg"
const fmtDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
const fmtShort = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: TZ })
const fmtWhen = (iso: string) => new Date(iso).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })

// ---------- demo data (used when no API is configured) ----------------------
const DEMO_SERVICES: Service[] = [
  { id: "intro", label: "Free 15-min intro call", minutes: 15 },
  { id: "consult", label: "Project consultation", minutes: 60 },
  { id: "fix", label: "Shopify fix session", minutes: 60 },
  { id: "review", label: "Design review", minutes: 30 },
]
const HOURS: Record<number, [number, number]> = { 1: [9, 17], 2: [9, 17], 3: [9, 17], 4: [9, 17], 5: [9, 17], 6: [9, 13] }
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
function demoDays(service: string, extra: Booking[]): Day[] {
  const minutes = DEMO_SERVICES.find((s) => s.id === service)?.minutes ?? 15
  const out: Day[] = []
  const now = new Date()
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i))
    const date = d.toISOString().slice(0, 10)
    const hours = HOURS[d.getUTCDay()]
    const slots: Slot[] = []
    let booked = 0
    if (hours) {
      for (let t = hours[0] * 60; t + minutes <= hours[1] * 60; t += 30) {
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(t / 60) - 2, t % 60))
        if (start.getTime() < now.getTime() + 2 * 3600e3) continue
        const taken = seeded(i * 50 + t) < 0.18 + 0.25 * seeded(i) || extra.some((b) => b.start === start.toISOString())
        if (taken) booked++
        slots.push({ start: start.toISOString(), end: new Date(start.getTime() + minutes * 60e3).toISOString(), free: !taken })
      }
    }
    out.push({ date, open: Boolean(hours), booked, slots })
  }
  return out
}
function demoHistory(email: string): Booking[] {
  const out: Booking[] = []
  const now = Date.now()
  for (let i = 0; i < 14; i++) {
    const start = new Date(now - (i * 11 + 3) * 864e5 + (i % 3) * 3600e3)
    out.push({
      id: "demo-" + i, service: DEMO_SERVICES[i % 4].id, start: start.toISOString(), end: new Date(start.getTime() + 3600e3).toISOString(),
      name: "You", email, phone: "", notes: "", status: i % 5 === 3 ? "cancelled" : "confirmed",
    })
  }
  out.unshift({ id: "demo-next", service: "consult", start: new Date(now + 4 * 864e5).toISOString(), end: new Date(now + 4 * 864e5 + 3600e3).toISOString(), name: "You", email, phone: "", notes: "", status: "confirmed" })
  return out
}
function statsOf(list: Booking[]): Stats {
  const now = Date.now()
  const active = (b: Booking) => b.status !== "cancelled"
  const byDay: Record<string, number> = {}
  list.filter(active).forEach((b) => (byDay[b.start.slice(0, 10)] = (byDay[b.start.slice(0, 10)] || 0) + 1))
  const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
  return {
    total: list.length,
    upcoming: list.filter((b) => active(b) && +new Date(b.start) > now).length,
    completed: list.filter((b) => active(b) && +new Date(b.end) <= now).length,
    cancelled: list.filter((b) => !active(b)).length,
    busiest: busiest ? { day: busiest[0], count: busiest[1] } : null,
  }
}

// ---------- api ----------------------------------------------------------------
async function api<T>(path: string, init?: RequestInit & { session?: string }): Promise<T> {
  const r = await fetch(BOOKING_API.replace(/\/$/, "") + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.session ? { Authorization: "Bearer " + init.session } : {}) },
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || "Something went wrong")
  return data as T
}

const SESSION_KEY = "mpho-booking-session"
const readSession = () => {
  try {
    return localStorage.getItem(SESSION_KEY) || ""
  } catch {
    return ""
  }
}
const saveSession = (s: string) => {
  try {
    if (s) localStorage.setItem(SESSION_KEY, s)
    else localStorage.removeItem(SESSION_KEY)
  } catch {}
}

// ---------- small pieces ------------------------------------------------------
function Stat({ label, value, unit, sub }: { label: string; value: React.ReactNode; unit?: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="chrome-text text-4xl font-black tracking-tight">{value}</span>
        {unit ? <span className="text-sm text-white/80">{unit}</span> : null}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function ModeToggle({ mode, setMode }: { mode: "3d" | "2d"; setMode: (m: "3d" | "2d") => void }) {
  return (
    <div className="glass inline-flex rounded-xl p-1">
      {(["2d", "3d"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={"rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition " + (mode === m ? "bg-white text-black" : "text-muted-foreground hover:text-white")}
          aria-pressed={mode === m}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

const input = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-pink-400/60"

// ---------- booking -------------------------------------------------------------
function BookPanel() {
  const demo = !BOOKING_API
  const [services, setServices] = React.useState<Service[]>(DEMO_SERVICES)
  const [service, setService] = React.useState("intro")
  const [days, setDays] = React.useState<Day[]>([])
  const [history, setHistory] = React.useState(0)
  const [date, setDate] = React.useState<string | null>(null)
  const [slot, setSlot] = React.useState<Slot | null>(null)
  const [mode, setMode] = React.useState<"3d" | "2d">("3d")
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", notes: "" })
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState<Booking | null>(null)
  const [demoBooked, setDemoBooked] = React.useState<Booking[]>([])

  const load = React.useCallback(async () => {
    setError("")
    if (demo) {
      setDays(demoDays(service, demoBooked))
      setHistory(128 + demoBooked.length)
      return
    }
    try {
      const d = await api<{ services: Service[]; days: Day[]; history: { total: number } }>("/mpho/bookings/availability?days=42&service=" + service)
      setServices(d.services)
      setDays(d.days)
      setHistory(d.history.total)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [demo, service, demoBooked])
  React.useEffect(() => {
    load()
  }, [load])

  const cells: HeatCell[] = days.map((d) => {
    const free = d.slots.filter((s) => s.free).length
    return {
      date: d.date,
      value: d.booked,
      disabled: !d.open || free === 0,
      label: !d.open ? `${fmtShort(d.date)} · closed` : free === 0 ? `${fmtShort(d.date)} · fully booked` : `${fmtShort(d.date)} · ${d.booked} booked · ${free} open`,
    }
  })
  const week = days.slice(0, 7)
  const openThisWeek = week.reduce((n, d) => n + d.slots.filter((s) => s.free).length, 0)
  const next = days.flatMap((d) => d.slots).find((s) => s.free)
  const busiest = [...days].sort((a, b) => b.booked - a.booked)[0]
  const day = days.find((d) => d.date === date)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slot) return
    setBusy(true)
    setError("")
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700))
        const b: Booking = { id: "demo-" + Date.now(), service, start: slot.start, end: slot.end, ...form, status: "confirmed" }
        setDemoBooked((x) => [...x, b])
        setDone(b)
      } else {
        const r = await api<{ booking: Booking; session: string }>("/mpho/bookings", { method: "POST", body: JSON.stringify({ service, start: slot.start, ...form }) })
        saveSession(r.session)
        setDone(r.booking)
        load()
      }
    } catch (err) {
      setError((err as Error).message)
      load()
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-3xl">✓</div>
        <h3 className="mt-6 text-3xl font-black">You&apos;re booked!</h3>
        <p className="mt-3 text-muted-foreground">
          {services.find((s) => s.id === done.service)?.label} · <span className="text-white">{fmtWhen(done.start)}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">A confirmation is on its way to {done.email}. You can see or cancel it under &quot;My bookings&quot;.</p>
        <button onClick={() => { setDone(null); setSlot(null); setDate(null) }} className="mt-8 rounded-full bg-white px-6 py-3 font-semibold text-black">
          Book another
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* 1. service */}
      <div className="flex flex-wrap justify-center gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => { setService(s.id); setSlot(null) }}
            className={"rounded-full px-4 py-2.5 text-sm font-semibold transition " + (service === s.id ? "bg-white text-black" : "glass text-white/80 hover:text-white")}
          >
            {s.label} <span className="opacity-60">· {s.minutes} min</span>
          </button>
        ))}
      </div>

      {/* 2. the calendar */}
      <div className="glass rounded-3xl p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-bold">{history.toLocaleString()}</span> <span className="text-muted-foreground">sessions booked so far</span>
            {demo ? <span className="ml-2 rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-pink-300 uppercase">Demo data</span> : null}
          </p>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_220px]">
          <BookingHeatmap3D cells={cells} selected={date} onSelect={(d) => { setDate(d); setSlot(null) }} mode={mode} height={380} />
          <div className="grid grid-cols-2 content-center gap-6 lg:grid-cols-1">
            <Stat label="Open this week" value={openThisWeek} unit="slots" />
            <Stat label="Next available" value={next ? fmtTime(next.start) : "—"} sub={next ? fmtShort(next.start.slice(0, 10)) : undefined} />
            <Stat label="Busiest day" value={busiest?.booked ?? 0} unit="booked" sub={busiest ? fmtShort(busiest.date) : undefined} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Drag to orbit · double-click to reset · tap a day to see times</span>
          <span className="flex items-center gap-1.5">
            Quiet {["#2a2440", "#5b2a6e", "#9b3fb0", "#ff4d8d", "#ffc2dc"].map((c) => <i key={c} className="inline-block h-3 w-3 rounded-sm" style={{ background: c }} />)} Busy
          </span>
        </div>
      </div>

      {/* 3. times + details */}
      {day ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <h3 className="text-xl font-bold">{fmtDay(day.date)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Times are South Africa time (SAST).</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {day.slots.map((s) => (
                <button
                  key={s.start}
                  disabled={!s.free}
                  onClick={() => setSlot(s)}
                  className={
                    "rounded-xl py-2.5 text-sm font-semibold transition " +
                    (!s.free ? "cursor-not-allowed bg-white/[.03] text-white/25 line-through" : slot?.start === s.start ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-[0_0_30px_-5px_rgba(255,77,141,.7)]" : "border border-white/10 bg-white/5 hover:border-pink-400/60")
                  }
                >
                  {fmtTime(s.start)}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={submit} className={"glass rounded-3xl p-6 transition " + (slot ? "" : "pointer-events-none opacity-40")}>
            <h3 className="text-xl font-bold">{slot ? `Confirm ${fmtTime(slot.start)}` : "Pick a time"}</h3>
            <div className="mt-5 grid gap-3">
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
              <input placeholder="WhatsApp number (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
              <textarea rows={3} placeholder="What do you need help with?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} />
            </div>
            {error ? <p className="mt-3 text-sm text-pink-400">{error}</p> : null}
            <button disabled={busy || !slot} className="mt-4 w-full rounded-full bg-white py-3 font-semibold text-black transition hover:scale-[1.01] disabled:opacity-60">
              {busy ? "Booking…" : "Book it"}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{error || "Pick a day on the calendar to see open times."}</p>
      )}
    </div>
  )
}

// ---------- my bookings -------------------------------------------------------------
function MinePanel() {
  const demo = !BOOKING_API
  const [session, setSession] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [step, setStep] = React.useState<"email" | "code" | "in">("email")
  const [data, setData] = React.useState<{ email: string; stats: Stats; bookings: Booking[] } | null>(null)
  const [mode, setMode] = React.useState<"3d" | "2d">("3d")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async (s: string) => {
    if (demo) return
    try {
      const d = await api<{ email: string; stats: Stats; bookings: Booking[] }>("/mpho/bookings/mine", { session: s })
      setData(d)
      setStep("in")
    } catch {
      saveSession("")
      setSession("")
      setStep("email")
    }
  }, [demo])
  React.useEffect(() => {
    const s = readSession()
    if (s) {
      setSession(s)
      load(s)
    }
  }, [load])

  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 500))
        if (step === "email") setStep("code")
        else {
          const list = demoHistory(email)
          setData({ email, stats: statsOf(list), bookings: list })
          setStep("in")
        }
      } else if (step === "email") {
        await api("/mpho/bookings/login", { method: "POST", body: JSON.stringify({ email }) })
        setStep("code")
      } else {
        const r = await api<{ session: string }>("/mpho/bookings/verify", { method: "POST", body: JSON.stringify({ email, code }) })
        saveSession(r.session)
        setSession(r.session)
        await load(r.session)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (b: Booking) => {
    if (!confirm("Cancel " + fmtWhen(b.start) + "?")) return
    if (demo) {
      const list = data!.bookings.map((x) => (x.id === b.id ? { ...x, status: "cancelled" } : x))
      setData({ ...data!, bookings: list, stats: statsOf(list) })
      return
    }
    try {
      await api("/mpho/bookings/" + encodeURIComponent(b.id) + "/cancel", { method: "POST", session })
      load(session)
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (step !== "in" || !data) {
    return (
      <form onSubmit={go} className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
        <h3 className="text-2xl font-black">My bookings</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "email" ? "Enter the email you booked with. We'll send you a 6-digit code." : `Enter the code we sent to ${email}.`}
        </p>
        {step === "email" ? (
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input + " mt-6 text-center"} />
        ) : (
          <input required inputMode="numeric" maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={input + " mt-6 text-center text-2xl tracking-[.5em]"} />
        )}
        {error ? <p className="mt-3 text-sm text-pink-400">{error}</p> : null}
        <button disabled={busy} className="mt-4 w-full rounded-full bg-white py-3 font-semibold text-black disabled:opacity-60">
          {busy ? "…" : step === "email" ? "Send code" : "Open my bookings"}
        </button>
        {demo ? <p className="mt-3 text-xs text-pink-300">Demo: any email and any code works.</p> : null}
      </form>
    )
  }

  // Last 26 weeks of this client's bookings, as a heatmap.
  const byDay: Record<string, number> = {}
  data.bookings.filter((b) => b.status !== "cancelled").forEach((b) => (byDay[b.start.slice(0, 10)] = (byDay[b.start.slice(0, 10)] || 0) + 1))
  const cells: HeatCell[] = []
  const today = new Date()
  for (let i = -26 * 7 + 1; i <= 14; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i)).toISOString().slice(0, 10)
    const n = byDay[d] || 0
    cells.push({ date: d, value: n, label: `${fmtShort(d)} · ${n ? n + " booking" + (n > 1 ? "s" : "") : "no bookings"}` })
  }
  const s = data.stats
  const services = Object.fromEntries(DEMO_SERVICES.map((x) => [x.id, x.label]))

  return (
    <div className="grid gap-6">
      <div className="glass rounded-3xl p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-bold">{s.total}</span> <span className="text-muted-foreground">bookings with Mpho · {data.email}</span>
          </p>
          <div className="flex items-center gap-2">
            <ModeToggle mode={mode} setMode={setMode} />
            <button onClick={() => { saveSession(""); setStep("email"); setData(null) }} className="text-xs text-muted-foreground hover:text-white">
              Sign out
            </button>
          </div>
        </div>
        <BookingHeatmap3D cells={cells} mode={mode} height={280} />
        <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="All time" value={s.total} unit="bookings" />
          <Stat label="Upcoming" value={s.upcoming} unit="sessions" />
          <Stat label="Completed" value={s.completed} unit="sessions" />
          <Stat label="Cancelled" value={s.cancelled} unit="sessions" />
        </div>
      </div>
      <div className="glass divide-y divide-white/10 rounded-3xl">
        {data.bookings.map((b) => {
          const future = +new Date(b.start) > Date.now()
          const cancelled = b.status === "cancelled"
          return (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className={"font-semibold " + (cancelled ? "text-white/40 line-through" : "")}>{services[b.service] || b.service}</p>
                <p className="text-sm text-muted-foreground">{fmtWhen(b.start)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-bold " +
                    (cancelled ? "bg-white/5 text-white/40" : future ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white" : "bg-emerald-400/15 text-emerald-300")
                  }
                >
                  {cancelled ? "Cancelled" : future ? "Upcoming" : "Done"}
                </span>
                {future && !cancelled ? (
                  <button onClick={() => cancel(b)} className="text-xs text-muted-foreground hover:text-pink-400">
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingStudio() {
  const [tab, setTab] = React.useState<"book" | "mine">("book")
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex justify-center">
        <div className="glass inline-flex rounded-full p-1.5" role="tablist">
          {([["book", "Book a session"], ["mine", "My bookings"]] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={"rounded-full px-5 py-2.5 text-sm font-semibold transition " + (tab === id ? "bg-white text-black" : "text-muted-foreground hover:text-white")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "book" ? <BookPanel /> : <MinePanel />}
    </div>
  )
}
