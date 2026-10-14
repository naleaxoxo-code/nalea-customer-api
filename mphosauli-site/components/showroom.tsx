"use client"

import * as React from "react"
import { SHOWROOM, rand, type ShowItem, type Kind } from "@/lib/showroom"
import { SITE, waLink } from "@/lib/site"

type Filter = "all" | Kind
type Device = "desktop" | "tablet" | "phone"

const DEVICES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1440, h: 900, label: "Desktop" },
  tablet: { w: 834, h: 1112, label: "Tablet" },
  phone: { w: 390, h: 844, label: "Phone" },
}

// Hides the "design preview" badge baked into the files.
// Sandboxed demos have no storage, so give them an in-memory one.
const PREVIEW_CSS =
  "<script>(function(){function M(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}" +
  "['localStorage','sessionStorage'].forEach(function(n){try{window[n].length}catch(e){Object.defineProperty(window,n,{value:M()})}})})()</script>" +
  "<style>.demo{display:none!important}</style>"
const withPreview = (t: string) => (/<head[^>]*>/i.test(t) ? t.replace(/<head[^>]*>/i, (m) => m + PREVIEW_CSS) : PREVIEW_CSS + t)

const htmlCache = new Map<string, Promise<string>>()
function loadHtml(url: string) {
  if (!htmlCache.has(url)) {
    htmlCache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      }),
    )
  }
  return htmlCache.get(url)!
}

function buyUrl(variant: string) {
  const onShopify = typeof window !== "undefined" && "Shopify" in window
  return (onShopify ? "" : SITE.shop) + `/cart/${variant}:1`
}

/* ---------------- Live thumbnail (widgets animate, so a still shot looks empty) ---------------- */

function LiveThumb({ it }: { it: ShowItem }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [doc, setDoc] = React.useState<string | null>(null)
  const [w, setW] = React.useState(400)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      loadHtml(it.html)
        .then((t) => setDoc(withPreview(t)))
        .catch(() => {})
    }, { rootMargin: "200px" })
    io.observe(el)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [it.html])
  const W = 1280
  return (
    <div ref={ref} className="absolute inset-x-0 top-7 bottom-0 overflow-hidden bg-[#0c0c10]">
      {doc ? (
        <iframe
          title={`${it.name} live thumbnail`}
          srcDoc={doc}
          sandbox="allow-scripts"
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none origin-top-left border-0"
          style={{ width: W, height: W * 0.66, transform: `scale(${w / W})` }}
        />
      ) : (
        <div className="sr-shimmer size-full" />
      )}
    </div>
  )
}

/* ---------------- Card ---------------- */

function Card({ it, index, onOpen }: { it: ShowItem; index: number; onOpen: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const move = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty("--mx", `${x * 100}%`)
    el.style.setProperty("--my", `${y * 100}%`)
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`)
    el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`)
  }
  const leave = () => {
    ref.current?.style.setProperty("--rx", "0deg")
    ref.current?.style.setProperty("--ry", "0deg")
  }
  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className="sr-card reveal group relative"
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
    >
      <div className="sr-tilt glass relative overflow-hidden rounded-[28px] p-3">
        <div className="sr-glare pointer-events-none absolute inset-0 z-20 rounded-[28px]" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Try ${it.name} live`}
          className="relative block aspect-[16/11] w-full overflow-hidden rounded-[20px] bg-white/5 text-left"
        >
          {/* browser chrome */}
          <div className="absolute inset-x-0 top-0 z-10 flex h-7 items-center gap-1.5 bg-black/55 px-3 backdrop-blur">
            <i className="size-2 rounded-full bg-[#ff5f57]" />
            <i className="size-2 rounded-full bg-[#febc2e]" />
            <i className="size-2 rounded-full bg-[#28c840]" />
            <span className="ml-2 truncate font-mono text-[10px] text-white/50">
              {it.slug.replace(/^\d+-/, "")}.myshopify.com
            </span>
          </div>
          {it.kind === "store" ? (
            <img
              src={it.full}
              alt={`${it.name} store design`}
              loading="lazy"
              className="sr-scroll absolute inset-x-0 top-7 w-full"
            />
          ) : (
            <LiveThumb it={it} />
          )}
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 opacity-0 transition duration-500 group-hover:bg-black/35 group-hover:opacity-100">
            <span className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black shadow-2xl">▶ Try it live</span>
          </span>
          <span className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-white/85 uppercase backdrop-blur">
            <i className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Live demo
          </span>
        </button>

        <div className="flex items-end justify-between gap-3 px-2 pt-4 pb-1">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">{it.tag}</p>
            <h3 className="mt-1 truncate text-xl font-black tracking-tight">{it.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.blurb}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] tracking-widest text-white/45 uppercase">from</p>
            <p className="chrome-text text-2xl font-black">{rand(it.code.price)}</p>
          </div>
        </div>
        <div className="flex gap-2 px-2 pt-3 pb-2">
          <button
            type="button"
            onClick={onOpen}
            className="glass glass-hover flex-1 rounded-full px-4 py-2.5 text-sm font-semibold"
          >
            Preview
          </button>
          <a
            href={buyUrl(it.code.id)}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-center text-sm font-bold text-black transition hover:scale-[1.03]"
          >
            Buy code
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Live viewer ---------------- */

function Viewer({ items, start, onClose }: { items: ShowItem[]; start: number; onClose: () => void }) {
  const [i, setI] = React.useState(start)
  const it = items[i]
  const [device, setDevice] = React.useState<Device>("desktop")
  const [hue, setHue] = React.useState(0)
  const [plan, setPlan] = React.useState<"code" | "install">("code")
  const [doc, setDoc] = React.useState<string | null>(null)
  const [err, setErr] = React.useState(false)
  const [panel, setPanel] = React.useState(true)
  const stage = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 1000, h: 700 })

  React.useEffect(() => {
    let live = true
    setDoc(null)
    setErr(false)
    setHue(0)
    loadHtml(it.html)
      .then((t) => live && setDoc(withPreview(t)))
      .catch(() => live && setErr(true))
    return () => {
      live = false
    }
  }, [it.html])

  React.useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") setI((v) => (v + 1) % items.length)
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + items.length) % items.length)
    }
    window.addEventListener("keydown", key)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", key)
      document.body.style.overflow = prev
    }
  }, [items.length, onClose])

  // On a small screen the real phone width is shown 1:1.
  React.useEffect(() => {
    if (window.innerWidth < 700) {
      setDevice("phone")
      setPanel(false)
    }
  }, [])

  const d = DEVICES[device]
  const pad = 24
  const scale = Math.min(1, (box.w - pad * 2) / d.w, (box.h - pad * 2) / d.h)
  const chosen = plan === "code" ? it.code : it.install

  return (
    <div className="sr-viewer fixed inset-0 z-[100] flex flex-col bg-[#050507]/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`${it.name} live preview`}>
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5 md:gap-3 md:px-5">
        <button type="button" onClick={onClose} className="glass glass-hover rounded-full px-3 py-1.5 text-sm" aria-label="Close preview">
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black tracking-tight">{it.name}</p>
          <p className="truncate font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
            {it.kind === "store" ? "Store design" : "Widget"} · {i + 1}/{items.length}
          </p>
        </div>
        <div className="glass hidden rounded-full p-1 sm:flex">
          {(Object.keys(DEVICES) as Device[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDevice(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${device === k ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
            >
              {DEVICES[k].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setI((v) => (v - 1 + items.length) % items.length)} className="glass glass-hover rounded-full px-3 py-1.5 text-sm" aria-label="Previous design">
            ←
          </button>
          <button type="button" onClick={() => setI((v) => (v + 1) % items.length)} className="glass glass-hover rounded-full px-3 py-1.5 text-sm" aria-label="Next design">
            →
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPanel((p) => !p)}
          className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition hover:scale-105"
        >
          {panel ? "Hide" : "Buy"} {rand(chosen.price)}
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* stage */}
        <div ref={stage} className="sr-stage relative min-w-0 flex-1 overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 overflow-hidden rounded-[18px] bg-white shadow-[0_40px_120px_-20px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.15)] transition-[width,height] duration-500"
            style={{
              width: d.w,
              height: d.h,
              transform: `translate(-50%,-50%) scale(${scale})`,
              borderRadius: device === "phone" ? 44 : device === "tablet" ? 28 : 14,
            }}
          >
            {doc ? (
              <iframe
                key={it.slug}
                title={`${it.name} live preview`}
                srcDoc={doc}
                sandbox="allow-scripts allow-forms allow-popups"
                className="size-full border-0"
                style={{ filter: hue ? `hue-rotate(${hue}deg)` : undefined }}
              />
            ) : (
              <div className="sr-shimmer flex size-full items-center justify-center bg-[#0c0c10] text-white/60">
                {err ? (
                  <img src={it.shot} alt={it.name} className="size-full object-cover object-top" />
                ) : (
                  <span className="font-mono text-xs tracking-[0.3em] uppercase">Loading live demo…</span>
                )}
              </div>
            )}
          </div>
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
            It&apos;s live. Click, scroll and play with it.
          </p>
        </div>

        {/* buy panel */}
        {panel ? (
          <aside className="sr-panel glass absolute inset-x-2 bottom-2 z-10 max-h-[75%] overflow-y-auto rounded-[24px] p-5 md:static md:inset-auto md:m-3 md:max-h-none md:w-[340px] md:shrink-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">{it.tag}</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">{it.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{it.blurb}</p>

            <div className="mt-5 space-y-2">
              {(
                [
                  ["code", "Code only", it.code.price, "Files emailed to you within 2 hours. Install it yourself."],
                  ["install", "Installed for you", it.install.price, it.kind === "store" ? "I set it up on your Shopify with your logo, colours and products. 5 working days." : "I add it to your store and match your colours. 2 working days."],
                ] as const
              ).map(([k, label, price, note]) => (
                <label
                  key={k}
                  className={`block cursor-pointer rounded-2xl border p-3.5 transition ${plan === k ? "border-white/60 bg-white/10" : "border-white/10 hover:border-white/25"}`}
                >
                  <input type="radio" name="plan" className="sr-only" checked={plan === k} onChange={() => setPlan(k)} />
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <i className={`size-3.5 rounded-full border-2 ${plan === k ? "border-white bg-accent" : "border-white/40"}`} />
                      {label}
                    </span>
                    <span className="font-black">{rand(price)}</span>
                  </span>
                  <span className="mt-1 block pl-5.5 text-xs text-muted-foreground">{note}</span>
                </label>
              ))}
            </div>

            <a
              href={buyUrl(chosen.id)}
              className="sr-buy mt-4 block rounded-full bg-white py-3.5 text-center font-black text-black transition hover:scale-[1.02]"
            >
              Buy now · {rand(chosen.price)}
            </a>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Try another colour</span>
                {hue ? (
                  <button type="button" onClick={() => setHue(0)} className="underline">
                    reset
                  </button>
                ) : null}
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="sr-hue mt-2 w-full"
                aria-label="Shift the preview colours"
              />
              <p className="mt-1 text-[11px] text-white/45">A rough preview. On install I match your exact brand colours.</p>
            </div>

            <ul className="mt-5 space-y-1.5 text-xs text-white/70">
              <li>✦ Secure Shopify checkout</li>
              <li>✦ Download link in your inbox within 2 hours</li>
              <li>✦ Works on phone, tablet and desktop</li>
              <li>✦ Help on WhatsApp if you get stuck</li>
            </ul>
            <a
              href={waLink(`Hi Mpho! I have a question about the ${it.name} ${it.kind === "store" ? "store design" : "widget"}.`)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-center text-xs text-white/60 underline hover:text-white"
            >
              Questions? Ask me on WhatsApp
            </a>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

/* ---------------- Section ---------------- */

export default function Showroom() {
  const [filter, setFilter] = React.useState<Filter>("all")

  // Links like #showroom/store open the showroom on that tab.
  React.useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/^#showroom\/(store|widget)$/)
      if (!m) return
      setFilter(m[1] as Kind)
      document.getElementById("showroom")?.scrollIntoView({ behavior: "smooth" })
    }
    read()
    window.addEventListener("hashchange", read)
    return () => window.removeEventListener("hashchange", read)
  }, [])
  const [open, setOpen] = React.useState<number | null>(null)
  const items = filter === "all" ? SHOWROOM : SHOWROOM.filter((x) => x.kind === filter)
  const counts = {
    all: SHOWROOM.length,
    store: SHOWROOM.filter((x) => x.kind === "store").length,
    widget: SHOWROOM.filter((x) => x.kind === "widget").length,
  }

  // Warm the cache for the first few demos so "Try it live" feels instant.
  React.useEffect(() => {
    const t = setTimeout(() => items.slice(0, 3).forEach((x) => loadHtml(x.html).catch(() => {})), 1500)
    return () => clearTimeout(t)
  }, [items])

  // Cards re-mount when the filter changes; reveal them straight away.
  React.useEffect(() => {
    document.querySelectorAll(".sr-card").forEach((el) => el.setAttribute("data-in", ""))
  }, [filter])

  return (
    <section id="showroom" className="relative scroll-mt-20 overflow-hidden px-6 py-32">
      <div aria-hidden="true" className="sr-bg pointer-events-none absolute inset-0" />

      <div className="reveal relative mx-auto mb-12 max-w-3xl text-center">
        <p className="mb-4 font-mono text-xs tracking-[0.3em] text-accent uppercase">The Showroom</p>
        <h2 className="text-4xl font-black tracking-tight md:text-6xl">
          Try the store <span className="glow-text">before you buy it</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Every design here is a working demo. Open it on desktop, tablet or phone, click around, then take it home as code or have me install it.
        </p>
      </div>

      <div className="reveal relative mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["⚡", "In your inbox", "within 2 hours"],
          ["🛠", "Install option", "done by me"],
          ["📱", "Mobile-perfect", "every screen"],
          ["🔒", "Secure checkout", "via Shopify"],
        ].map(([icon, a, b]) => (
          <div key={a} className="glass rounded-2xl px-4 py-3 text-center">
            <p className="text-lg">{icon}</p>
            <p className="text-sm font-bold">{a}</p>
            <p className="text-xs text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <div className="relative mb-10 flex justify-center">
        <div className="glass flex rounded-full p-1.5" role="tablist">
          {(
            [
              ["all", "Everything"],
              ["store", "Store designs"],
              ["widget", "Widgets"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition md:px-5 ${filter === k ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
            >
              {label} <span className="opacity-50">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={filter} className="relative mx-auto grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, n) => (
          <Card key={it.slug} it={it} index={n} onOpen={() => setOpen(n)} />
        ))}
      </div>

      <div className="reveal relative mx-auto mt-16 max-w-2xl text-center">
        <p className="text-muted-foreground">Want something nobody else has?</p>
        <a
          href={waLink("Hi Mpho! I'd like a custom store design.")}
          target="_blank"
          rel="noreferrer"
          className="glass glass-hover mt-4 inline-block rounded-full px-6 py-3 font-semibold"
        >
          Get a custom design →
        </a>
      </div>

      {open !== null ? <Viewer items={items} start={open} onClose={() => setOpen(null)} /> : null}
    </section>
  )
}
