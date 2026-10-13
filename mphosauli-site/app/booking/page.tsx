import BookingStudio from "@/components/booking-studio"

export const metadata = { title: "Book a session — Mpho Sauli" }

export default function BookingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="blob" style={{ width: 520, height: 520, left: "-8%", top: "4%", background: "#ff4d8d" }} />
        <div className="blob" style={{ width: 460, height: 460, right: "-6%", top: "30%", background: "#6d5dfc", animationDelay: "-6s" }} />
      </div>
      <div className="relative">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 font-mono text-xs tracking-[0.3em] text-accent uppercase">Bookings</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Let&apos;s <span className="glow-text">talk</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">Pick a time that works for you. Free intro calls, project planning, Shopify fixes and design reviews.</p>
        </div>
        <BookingStudio />
      </div>
    </main>
  )
}
