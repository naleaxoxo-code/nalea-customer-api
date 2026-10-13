"use client"

import * as React from "react"
import WavingPortfolioHero from "@/components/ui/waving-portfolio-hero"
import MurmurationWordmark from "@/components/ui/murmuration-wordmark"
import GlassFolder from "@/components/ui/glass-folder-cards"
import { PACKAGES, SITE, waLink, type Pkg } from "@/lib/site"

function useReveal() {
  React.useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal")
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "")
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.15 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function Blobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob" style={{ width: 520, height: 520, left: "-8%", top: "8%", background: "#ff4d8d" }} />
      <div className="blob" style={{ width: 460, height: 460, right: "-6%", top: "22%", background: "#6d5dfc", animationDelay: "-6s" }} />
      <div className="blob" style={{ width: 380, height: 380, left: "38%", bottom: "-10%", background: "#22d3ee", opacity: 0.35, animationDelay: "-12s" }} />
    </div>
  )
}

function Nav() {
  const links = [
    ["Services", "#services"],
    ["Work", "#work"],
    ["Packages", "#packages"],
    ["Contact", "#contact"],
  ]
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="glass bg-black/75! flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-3">
        <a href="#top" className="text-sm font-black tracking-[0.2em]">
          MPHO<span className="glow-text"> SAULI</span>
        </a>
        <div className="hidden gap-7 text-sm text-muted-foreground md:flex">
          {links.map(([l, h]) => (
            <a key={h} href={h} className="transition hover:text-white">
              {l}
            </a>
          ))}
        </div>
        <a
          href={waLink("Hi Mpho! I'd like to chat about a project.")}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105"
        >
          Let&apos;s talk
        </a>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <div id="top">
      <WavingPortfolioHero photo={(typeof window !== "undefined" && (window as unknown as { MPHO_PHOTO?: string }).MPHO_PHOTO) || "/mpho.webp"}>
        <div className="flex flex-wrap justify-center gap-3 font-sans">
          <a href="#packages" className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:scale-105">
            See packages
          </a>
          <a href={SITE.booking} className="glass glass-hover rounded-full px-6 py-3 font-semibold text-white">
            Book a call
          </a>
        </div>
      </WavingPortfolioHero>
    </div>
  )
}

function Marquee() {
  const items = ["Websites", "Shopify stores", "E-commerce ads", "Motion ads", "Brand kits", "Canva design", "Wedding visuals", "Shopify fixes"]
  const row = [...items, ...items]
  return (
    <div className="border-y border-white/10 py-6">
      <div className="overflow-hidden">
        <div className="marquee gap-12 text-3xl font-black tracking-tight md:text-5xl">
          {row.map((t, i) => (
            <span key={i} className={i % 2 ? "chrome-text" : "text-white/20"}>
              {t} ✦
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="reveal mx-auto mb-16 max-w-3xl text-center">
      <p className="mb-4 font-mono text-xs tracking-[0.3em] text-accent uppercase">{kicker}</p>
      <h2 className="text-4xl font-black tracking-tight md:text-6xl">{title}</h2>
      {sub ? <p className="mt-5 text-lg text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function Services() {
  return (
    <section id="services" className="relative px-6 py-32">
      <SectionHead
        kicker="Two worlds, one studio"
        title={
          <>
            What we <span className="glow-text">make</span>
          </>
        }
        sub="Open a folder to look inside."
      />
      <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
        <div className="reveal flex flex-col items-center gap-8">
          <GlassFolder
            label="Web Making"
            meta="Sites · Stores · Fixes"
            tone="dark"
            art="dusk"
            seed={7}
            action="none"
            labelPlacement="top-left"
            width={380}
            files={[
              { name: "Glossy websites", meta: "Custom", art: "aurora" },
              { name: "Shopify stores", meta: "E-com", art: "ember" },
              { name: "Shopify bug fixes", meta: "48h" },
              { name: "Motion & 3D", meta: "Animated", art: "glacier" },
            ]}
          />
          <ul className="max-w-sm space-y-2 text-center text-muted-foreground">
            <li>Websites & landing pages with glass, motion and 3D</li>
            <li>Shopify stores built, styled and loaded</li>
            <li>Broken store? Bugs found and fixed</li>
          </ul>
        </div>
        <div className="reveal flex flex-col items-center gap-8" style={{ transitionDelay: "150ms" }}>
          <GlassFolder
            label="Ads & Brand"
            meta="Ads · Motion · Canva"
            tone="dark"
            art="ember"
            seed={11}
            action="none"
            labelPlacement="top-left"
            width={380}
            files={[
              { name: "E-com ads", meta: "Static", art: "dusk" },
              { name: "Motion ads", meta: "Video", art: "verdant" },
              { name: "Brand kits", meta: "Identity" },
              { name: "Wedding visuals", meta: "Events", art: "aurora" },
            ]}
          />
          <ul className="max-w-sm space-y-2 text-center text-muted-foreground">
            <li>E-commerce ads with motion, effects and animation</li>
            <li>Logos, brand kits and Canva templates you keep</li>
            <li>Weddings, events and launch campaigns</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function Work() {
  return (
    <section id="work" className="relative px-6 py-32">
      <SectionHead
        kicker="Selected work"
        title={
          <>
            Built for <span className="chrome-text">Nalea xoxo</span>
          </>
        }
        sub="The full store, the ads and the brand — designed end to end."
      />
      <div className="reveal mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {[
          { t: "Shopify store", d: "Custom theme, customer accounts, 2FA and a glossy shopping experience.", g: "from-pink-500/40 to-violet-500/20" },
          { t: "E-commerce ads", d: "Product ads and motion reels that stop the scroll.", g: "from-violet-500/40 to-cyan-400/20" },
          { t: "Brand world", d: "Colours, type and visuals that make the brand unmistakable.", g: "from-cyan-400/40 to-pink-500/20" },
        ].map((c) => (
          <article key={c.t} className="glass glass-hover overflow-hidden rounded-3xl">
            <div className={"aspect-[4/3] bg-gradient-to-br " + c.g + " grid place-items-center"}>
              <span className="font-mono text-xs tracking-[0.25em] text-white/60 uppercase">Image coming</span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold">{c.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function PackageCard({ p, group }: { p: Pkg; group: string }) {
  const msg = "Hi Mpho! I'm interested in the " + group + " " + p.name + " package."
  return (
    <div
      className={
        "glass glass-hover relative flex flex-col rounded-3xl p-7 " +
        (p.featured ? "ring-1 ring-pink-400/60 shadow-[0_0_80px_-20px_rgba(255,77,141,.6)]" : "")
      }
    >
      {p.featured ? (
        <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 text-xs font-bold">
          Most popular
        </span>
      ) : null}
      <h3 className="text-lg font-bold">{p.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
      <p className="mt-6 text-4xl font-black tracking-tight">
        {p.custom ? <span className="glow-text">Custom</span> : <span className="chrome-text">{p.price}</span>}
        {p.note ? <span className="text-base font-medium text-muted-foreground"> {p.note}</span> : null}
      </p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {p.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-accent">✦</span>
            <span className="text-white/85">{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-2">
        {p.custom ? (
          <a href="#contact" className="rounded-full bg-white py-3 text-center font-semibold text-black transition hover:scale-[1.02]">
            Get a quote
          </a>
        ) : (
          <>
            <a href={SITE.shop} target="_blank" rel="noreferrer" className="rounded-full bg-white py-3 text-center font-semibold text-black transition hover:scale-[1.02]">
              Buy now
            </a>
            <a href={waLink(msg)} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 py-3 text-center text-sm font-semibold transition hover:bg-white/10">
              Book a call first
            </a>
          </>
        )}
      </div>
    </div>
  )
}

function Packages() {
  const [tab, setTab] = React.useState(PACKAGES[0].id)
  const group = PACKAGES.find((g) => g.id === tab) ?? PACKAGES[0]
  return (
    <section id="packages" className="relative px-6 py-32">
      <Blobs />
      <div className="relative">
        <SectionHead
          kicker="Packages"
          title={
            <>
              Pick your <span className="glow-text">glow-up</span>
            </>
          }
          sub="Clear prices in rands. Buy straight away, book a call, or ask for something custom."
        />
        <div className="reveal mb-12 flex justify-center">
          <div className="glass inline-flex rounded-full p-1.5" role="tablist">
            {PACKAGES.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={tab === g.id}
                onClick={() => setTab(g.id)}
                className={
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition " +
                  (tab === g.id ? "bg-white text-black" : "text-muted-foreground hover:text-white")
                }
              >
                {g.title}
              </button>
            ))}
          </div>
        </div>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">{group.tagline}</p>
        <div
          key={tab}
          className={
            "mx-auto grid max-w-6xl gap-6 md:grid-cols-2 " + (group.items.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")
          }
        >
          {group.items.map((p) => (
            <PackageCard key={p.name} p={p} group={group.title} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Flock() {
  return (
    <section aria-label="Mpho Sauli" className="relative">
      <MurmurationWordmark
        word="MPHO SAULI"
        preset="night"
        palette={{ skyTop: "#050507", skyLow: "#1a1030", sun: "#ff4d8d", ink: "#f4eefe" }}
        height="90svh"
      >
        <div className="flex h-full flex-col items-center justify-end pb-24 text-center">
          <p className="glass rounded-full px-5 py-2 text-sm">Move your mouse through the flock ✦</p>
        </div>
      </MurmurationWordmark>
    </section>
  )
}

function Process() {
  const steps = [
    ["01", "Chat", "Tell me about your brand on WhatsApp or a quick call."],
    ["02", "Design", "I design the look — glossy, moving, unmistakably you."],
    ["03", "Build", "Your site, store or ads come to life, with you reviewing along the way."],
    ["04", "Launch", "We go live, and I stay on hand for fixes and growth."],
  ]
  return (
    <section className="px-6 py-32">
      <SectionHead kicker="How it works" title={<>From idea to <span className="glow-text">wow</span></>} />
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
        {steps.map(([n, t, d], i) => (
          <div key={n} className="reveal glass glass-hover rounded-3xl p-7" style={{ transitionDelay: i * 100 + "ms" }}>
            <span className="chrome-text font-mono text-4xl font-black">{n}</span>
            <h3 className="mt-4 text-xl font-bold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Contact() {
  const [form, setForm] = React.useState({ name: "", email: "", service: "Web Making", message: "" })
  const body =
    "Name: " + form.name + "\nEmail: " + form.email + "\nService: " + form.service + "\n\n" + form.message
  return (
    <section id="contact" className="relative px-6 py-32">
      <Blobs />
      <div className="relative">
        <SectionHead
          kicker="Contact"
          title={
            <>
              Let&apos;s make it <span className="glow-text">glossy</span>
            </>
          }
          sub="Book a call, message on WhatsApp, or send your project details for a custom quote."
        />
        <div className="reveal mx-auto grid max-w-5xl gap-6 md:grid-cols-5">
          <form
            className="glass rounded-3xl p-8 md:col-span-3"
            onSubmit={(e) => {
              e.preventDefault()
              window.location.href =
                "mailto:" + SITE.email + "?subject=" + encodeURIComponent("Project enquiry — " + form.service) + "&body=" + encodeURIComponent(body)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-pink-400/60" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-pink-400/60" />
            </div>
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="mt-4 w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 outline-none">
              <option>Web Making</option>
              <option>Ads &amp; Brand</option>
              <option>Shopify Fix</option>
              <option>Wedding / Event</option>
              <option>Custom project</option>
            </select>
            <textarea required rows={5} placeholder="Tell me about your project…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-pink-400/60" />
            <button className="mt-4 w-full rounded-full bg-white py-3 font-semibold text-black transition hover:scale-[1.01]">Send enquiry</button>
          </form>
          <div className="flex flex-col gap-6 md:col-span-2">
            <a href={waLink("Hi Mpho! I'd like to chat about a project.")} target="_blank" rel="noreferrer" className="glass glass-hover rounded-3xl p-7">
              <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">Fastest</p>
              <p className="mt-2 text-2xl font-bold">WhatsApp me</p>
              <p className="mt-1 text-sm text-muted-foreground">Replies usually within the hour.</p>
            </a>
            <a href={SITE.booking} className="glass glass-hover rounded-3xl p-7">
              <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">Free</p>
              <p className="mt-2 text-2xl font-bold">Book a call</p>
              <p className="mt-1 text-sm text-muted-foreground">15 minutes to plan your project.</p>
            </a>
            <a href={"mailto:" + SITE.email} className="glass glass-hover rounded-3xl p-7">
              <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">Email</p>
              <p className="mt-2 text-lg font-bold break-all">{SITE.email}</p>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <p className="text-sm font-black tracking-[0.2em]">
          MPHO<span className="glow-text"> SAULI</span>
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href={SITE.instagram} className="hover:text-white">Instagram</a>
          <a href={SITE.tiktok} className="hover:text-white">TikTok</a>
          <a href={"mailto:" + SITE.email} className="hover:text-white">Email</a>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mpho Sauli · Made in South Africa</p>
      </div>
    </footer>
  )
}

function FloatingWhatsApp() {
  return (
    <a
      href={waLink("Hi Mpho! I'd like to chat about a project.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-5 bottom-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-2xl shadow-[0_10px_40px_-5px_rgba(37,211,102,.6)] transition hover:scale-110"
    >
      💬
    </a>
  )
}

export default function Home() {
  useReveal()
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Services />
      <Work />
      <Packages />
      <Flock />
      <Process />
      <Contact />
      <Footer />
      <FloatingWhatsApp />
    </main>
  )
}
