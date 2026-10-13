"use client"

// Booking Heatmap 3D — a calendar drawn as a field of glass bars, one per day,
// laid out weeks × weekdays. Bar height is how busy the day is. Drag to orbit,
// double-click to reset, toggle between the 3D field and a flat 2D grid (the
// camera tilts between them). Click a day to pick it. Canvas 2D only.
// After the 21st.dev "GitHub Contribution Graph 3D Heatmap", rebuilt for bookings.

import * as React from "react"

export type HeatCell = {
  date: string // YYYY-MM-DD
  value: number // bar height driver (bookings that day)
  disabled?: boolean // closed / outside range
  label?: string // tooltip
}

export interface BookingHeatmap3DProps {
  cells: HeatCell[] // in date order, first cell any weekday
  selected?: string | null
  onSelect?: (date: string) => void
  mode?: "3d" | "2d"
  height?: number
  /** Colour ramp from quiet to busy. */
  ramp?: string[]
}

const DEFAULT_RAMP = ["#2a2440", "#5b2a6e", "#9b3fb0", "#ff4d8d", "#ffc2dc"]
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function hex(h: string) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function shade(h: string, k: number) {
  const [r, g, b] = hex(h)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)

export default function BookingHeatmap3D({
  cells,
  selected = null,
  onSelect,
  mode = "3d",
  height = 340,
  ramp = DEFAULT_RAMP,
}: BookingHeatmap3DProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [tip, setTip] = React.useState<{ x: number; y: number; text: string } | null>(null)
  const state = React.useRef({ yaw: -0.62, pitch: 0.62, targetPitch: 0.62, grow: 0, hover: -1, drag: null as null | { x: number; yaw: number; moved: boolean } })
  const props = React.useRef({ cells, selected, onSelect, ramp })
  props.current = { cells, selected, onSelect, ramp }

  React.useEffect(() => {
    state.current.targetPitch = mode === "3d" ? 0.62 : 1.5
    state.current.grow = 0
  }, [mode, cells])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let w = 1
    let h = 1
    let dpr = 1
    let raf = 0
    let tops: { i: number; poly: number[][] }[] = []

    const size = () => {
      const r = wrap.getBoundingClientRect()
      w = r.width
      h = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
    }

    const layout = () => {
      const list = props.current.cells
      const first = list.length ? new Date(list[0].date + "T00:00:00Z").getUTCDay() : 0
      return list.map((c, i) => {
        const k = i + first
        return { c, i, col: Math.floor(k / 7), row: k % 7 }
      })
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const s = state.current
      s.pitch += (s.targetPitch - s.pitch) * (reduced ? 1 : 0.12)
      s.grow = reduced ? 1 : Math.min(1, s.grow + 0.022)
      const items = layout()
      if (!items.length) return
      const cols = items[items.length - 1].col + 1
      const max = Math.max(1, ...items.map((t) => t.c.value))
      const { ramp, selected } = props.current

      // Fit: unit cell size so the field fills the width.
      const cosY0 = Math.abs(Math.cos(s.yaw))
      const sinY0 = Math.abs(Math.sin(s.yaw))
      const spanX = cols * cosY0 + 7 * sinY0
      const spanY = (cols * sinY0 + 7 * cosY0) * Math.sin(s.pitch) + 2.6 * Math.cos(s.pitch)
      const u = Math.min((w * 0.9) / spanX, (h * 0.86) / spanY)
      const cx = cols / 2
      const cy = 3.5
      const cosY = Math.cos(s.yaw)
      const sinY = Math.sin(s.yaw)
      const sinP = Math.sin(s.pitch)
      const cosP = Math.cos(s.pitch)
      const ox = w / 2
      const oy = h * (0.5 + 0.08 * (1 - sinP))
      const proj = (x: number, y: number, z: number) => {
        const dx = x - cx
        const dy = y - cy
        const rx = dx * cosY - dy * sinY
        const ry = dx * sinY + dy * cosY
        return [ox + rx * u, oy + ry * u * sinP - z * u * cosP, ry]
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Back-to-front.
      const order = items
        .map((t) => ({ t, depth: proj(t.col + 0.5, t.row + 0.5, 0)[2] }))
        .sort((a, b) => a.depth - b.depth)
      tops = []
      const gap = 0.14
      for (const { t } of order) {
        const { c, col, row, i } = t
        const level = c.disabled ? -1 : c.value <= 0 ? 0 : Math.min(ramp.length - 1, 1 + Math.floor(((c.value - 0.001) / max) * (ramp.length - 1)))
        const delay = (col / Math.max(1, cols)) * 0.5
        const g = ease((s.grow - delay) / 0.5)
        const zH = c.disabled ? 0.04 : (0.08 + (c.value / max) * 2.4) * g
        const x0 = col + gap
        const x1 = col + 1 - gap
        const y0 = row + gap
        const y1 = row + 1 - gap
        const P = (x: number, y: number, z: number) => proj(x, y, z)
        const top = [P(x0, y0, zH), P(x1, y0, zH), P(x1, y1, zH), P(x0, y1, zH)]
        const bot = [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)]
        const base = c.disabled ? "#1a1a22" : ramp[Math.max(0, level)]
        const isSel = selected === c.date
        const isHover = s.hover === i
        // Side faces: draw all four, the painter's order hides the back ones.
        const faces: [number, number, number][] = [
          [0, 1, 0.55],
          [1, 2, 0.75],
          [2, 3, 0.62],
          [3, 0, 0.85],
        ]
        for (const [a, b, k] of faces) {
          ctx.beginPath()
          ctx.moveTo(bot[a][0], bot[a][1])
          ctx.lineTo(bot[b][0], bot[b][1])
          ctx.lineTo(top[b][0], top[b][1])
          ctx.lineTo(top[a][0], top[a][1])
          ctx.closePath()
          ctx.fillStyle = shade(base, k)
          ctx.fill()
        }
        ctx.beginPath()
        top.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
        ctx.closePath()
        ctx.fillStyle = isSel ? "#ffffff" : isHover && !c.disabled ? shade(base, 1.35) : shade(base, 1.12)
        ctx.fill()
        // Glass rim.
        ctx.strokeStyle = isSel ? "#ff4d8d" : "rgba(255,255,255,.14)"
        ctx.lineWidth = isSel ? 2 : 0.6
        ctx.stroke()
        if (!c.disabled) tops.push({ i, poly: top.map((p) => [p[0], p[1]]) })
      }

      // Month labels along the front edge.
      ctx.font = "500 11px ui-sans-serif, system-ui"
      ctx.fillStyle = "rgba(244,244,246,.45)"
      let lastM = -1
      for (const t of items) {
        const m = new Date(t.c.date + "T00:00:00Z").getUTCMonth()
        if (m !== lastM && t.row <= 1) {
          const p = proj(t.col + 0.2, -0.6, 0)
          ctx.fillText(MONTHS[m], p[0] - 8, p[1])
          lastM = m
        }
      }
      for (const r of [1, 3, 5]) {
        const p = proj(-0.9, r + 0.6, 0)
        ctx.fillText(DOW[r], p[0] - 14, p[1])
      }
    }

    const hit = (x: number, y: number) => {
      for (let k = tops.length - 1; k >= 0; k--) {
        const poly = tops[k].poly
        let inside = false
        for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
          const [xa, ya] = poly[a]
          const [xb, yb] = poly[b]
          if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside
        }
        if (inside) return tops[k].i
      }
      return -1
    }

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const down = (e: PointerEvent) => {
      state.current.drag = { x: e.clientX, yaw: state.current.yaw, moved: false }
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const s = state.current
      const [x, y] = pos(e)
      if (s.drag) {
        const dx = e.clientX - s.drag.x
        if (Math.abs(dx) > 3) s.drag.moved = true
        s.yaw = s.drag.yaw + dx * 0.008
        setTip(null)
        return
      }
      const i = hit(x, y)
      s.hover = i
      canvas.style.cursor = i >= 0 ? "pointer" : "grab"
      const c = i >= 0 ? props.current.cells[i] : null
      setTip(c ? { x, y, text: c.label || c.date } : null)
    }
    const up = (e: PointerEvent) => {
      const s = state.current
      const moved = s.drag?.moved
      s.drag = null
      if (moved) return
      const [x, y] = pos(e)
      const i = hit(x, y)
      if (i >= 0) props.current.onSelect?.(props.current.cells[i].date)
    }
    const leave = () => {
      state.current.hover = -1
      setTip(null)
    }
    const dbl = () => {
      state.current.yaw = -0.62
    }

    size()
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(size)
    ro.observe(wrap)
    canvas.addEventListener("pointerdown", down)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", up)
    canvas.addEventListener("pointerleave", leave)
    canvas.addEventListener("dblclick", dbl)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener("pointerdown", down)
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", up)
      canvas.removeEventListener("pointerleave", leave)
      canvas.removeEventListener("dblclick", dbl)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height, touchAction: "pan-y" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ maxWidth: "none" }} />
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-lg bg-black/85 px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  )
}
