"use client"

// Waving Name Hero — the name is painted once as polished chrome, then drawn
// every frame in thin vertical strips, each lifted by a travelling wave so the
// word ripples like a silk banner. Strips catch light on the crest and fall
// into shadow in the trough. The pointer pushes an extra ripple through it.
//
// Placeholder for the 21st.dev "waving portfolio landing" hero until its
// source is pasted in; the API (word, children) stays the same.

import * as React from "react"

export interface WavingNameHeroProps {
  word?: string
  children?: React.ReactNode
  height?: string
  className?: string
}

export default function WavingNameHero({
  word = "MPHO SAULI",
  children,
  height = "100svh",
  className = "",
}: WavingNameHeroProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let w = 1
    let h = 1
    let dpr = 1
    let raf = 0
    let visible = true
    let tex: HTMLCanvasElement | null = null
    let tw = 0
    let th = 0
    let mx = 0.5
    let my = 0.5
    let energy = 0
    const start = performance.now()

    const layout = () => {
      const r = root.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)

      // Paint the word as chrome into a texture.
      const t = document.createElement("canvas")
      const c = t.getContext("2d")
      if (!c) return
      const font = '900 100px "Inter Tight", "Inter", "Helvetica Neue", Arial, sans-serif'
      c.font = font
      const mw = c.measureText(word).width || 1
      const size = Math.min((w * 0.86 * 100) / mw, h * 0.26)
      tw = Math.ceil((mw * size) / 100 + size * 0.3)
      th = Math.ceil(size * 1.3)
      t.width = Math.round(tw * dpr)
      t.height = Math.round(th * dpr)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.font = '900 ' + size + 'px "Inter Tight", "Inter", "Helvetica Neue", Arial, sans-serif'
      c.textAlign = "center"
      c.textBaseline = "middle"
      const g = c.createLinearGradient(0, th * 0.12, 0, th * 0.88)
      g.addColorStop(0, "#ffffff")
      g.addColorStop(0.35, "#e4e4ec")
      g.addColorStop(0.5, "#7d7d8c")
      g.addColorStop(0.56, "#2c2c36")
      g.addColorStop(0.72, "#e9e9f2")
      g.addColorStop(1, "#ffb3cf")
      c.fillStyle = g
      c.fillText(word, tw / 2, th / 2)
      // A pink-violet rim light along the bottom edge of the letters.
      c.globalCompositeOperation = "source-atop"
      const rim = c.createLinearGradient(0, 0, tw, 0)
      rim.addColorStop(0, "rgba(255,77,141,.55)")
      rim.addColorStop(0.5, "rgba(138,125,255,.45)")
      rim.addColorStop(1, "rgba(125,211,252,.5)")
      c.fillStyle = rim
      c.fillRect(0, th * 0.66, tw, th * 0.34)
      c.globalCompositeOperation = "source-over"
      tex = t
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible || !tex) return
      const t = reduced ? 0 : (now - start) / 1000
      energy *= 0.96
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const ox = (w - tw) / 2
      const oy = h * 0.47 - th / 2
      const strip = 3
      const amp = th * 0.09
      for (let x = 0; x < tw; x += strip) {
        const u = x / tw
        // Banner is pinned on the left: the wave grows toward the free end.
        const reach = 0.35 + 0.65 * u
        const phase = u * 7 - t * 2.4
        const dist = Math.abs(u - mx)
        const push = energy * Math.exp(-dist * dist * 30) * Math.sin(u * 30 - t * 9)
        const dy = (Math.sin(phase) * amp + push * amp * 1.4) * reach
        const slope = Math.cos(phase) * reach
        ctx.drawImage(tex, x * dpr, 0, strip * dpr, th * dpr, ox + x, oy + dy, strip + 0.6, th)
        // Light on the crest, shade in the trough.
        const shade = slope * 0.28
        if (shade > 0) {
          ctx.fillStyle = "rgba(255,255,255," + shade.toFixed(3) + ")"
        } else {
          ctx.fillStyle = "rgba(0,0,0," + (-shade).toFixed(3) + ")"
        }
        ctx.globalCompositeOperation = "source-atop"
        ctx.fillRect(ox + x, oy + dy, strip + 0.6, th)
        ctx.globalCompositeOperation = "source-over"
      }
      // Reflection on the glass floor.
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.translate(0, oy * 2 + th * 1.92)
      ctx.scale(1, -0.45)
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, w, h)
      ctx.restore()
      void my
    }

    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width
      my = (e.clientY - r.top) / r.height
      energy = Math.min(1, energy + Math.abs(nx - mx) * 6)
      mx = nx
    }

    layout()
    raf = requestAnimationFrame(frame)
    root.addEventListener("pointermove", onMove)
    const ro = new ResizeObserver(layout)
    ro.observe(root)
    const io = new IntersectionObserver((e) => {
      visible = e[0]?.isIntersecting ?? true
    })
    io.observe(root)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      root.removeEventListener("pointermove", onMove)
    }
  }, [word])

  return (
    <div ref={rootRef} className={"relative w-full overflow-hidden " + className} style={{ height }}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <h1 className="sr-only">{word}</h1>
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </div>
  )
}
