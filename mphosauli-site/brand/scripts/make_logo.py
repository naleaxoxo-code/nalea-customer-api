"""Builds the Mpho Sauli logo set (Slice x Matrix Glitch) as pure-vector SVG.

usage: python make_logo.py <Oswald.ttf> <face.png> <outdir>
"""
import base64, io, math, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image, ImageOps, ImageDraw, ImageFilter

font_path, face_path, out = sys.argv[1:4]
F = {w: instantiateVariableFont(TTFont(font_path), {"wght": w}) for w in (500, 700)}

def text_path(s, size, weight=700, tracking=0.0, x=0.0, y=0.0):
    """Glyph outlines for s, baseline at y, returned as (svg d, width)."""
    f = F[weight]
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    upm = f["head"].unitsPerEm
    k = size / upm
    pen = SVGPathPen(gs)
    cx = 0.0
    for ch in s:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x + cx, y)))
        cx += hmtx[g][0] * k + tracking
    return pen.getCommands(), cx - tracking

def cap_height(size, weight=700):
    f = F[weight]; gs = f.getGlyphSet(); bp = BoundsPen(gs)
    gs[f.getBestCmap()[ord("H")]].draw(bp)
    return bp.bounds[3] * size / f["head"].unitsPerEm

PINK, VIOLET, GREEN, CYAN = "#ff2d7a", "#a64dff", "#2bff88", "#7dd3fc"

DEFS = f"""
  <linearGradient id="ms-fill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".46" stop-color="#ffe3ef"/>
    <stop offset=".5" stop-color="#ff9cc4"/><stop offset="1" stop-color="#ff4d8d"/>
  </linearGradient>
  <linearGradient id="ms-fill-b" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff4d8d"/><stop offset=".55" stop-color="#b14dff"/><stop offset="1" stop-color="#8a7dff"/>
  </linearGradient>
  <linearGradient id="ms-scan" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{PINK}" stop-opacity="0"/><stop offset=".12" stop-color="{PINK}"/>
    <stop offset=".5" stop-color="#ffffff"/><stop offset=".86" stop-color="{GREEN}"/><stop offset="1" stop-color="{GREEN}" stop-opacity="0"/>
  </linearGradient>
  <filter id="ms-glow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
"""

def sliced(d, top, bottom, mid, gap, shift, fill_top, fill_bot, uid, glitch=True, solid=None):
    """The signature: a word cut at `mid`, halves pushed apart, RGB-split at the cut."""
    W = 4000
    s = f"""
  <clipPath id="{uid}-t"><rect x="-{W}" y="{top - 50}" width="{2*W}" height="{mid - gap/2 - top + 50}"/></clipPath>
  <clipPath id="{uid}-b"><rect x="-{W}" y="{mid + gap/2}" width="{2*W}" height="{bottom - mid + 50}"/></clipPath>
  <clipPath id="{uid}-s1"><rect x="-{W}" y="{mid - gap/2 - (mid-top)*.30}" width="{2*W}" height="{(mid-top)*.07}"/></clipPath>
  <clipPath id="{uid}-s2"><rect x="-{W}" y="{mid + gap/2 + (bottom-mid)*.42}" width="{2*W}" height="{(bottom-mid)*.06}"/></clipPath>"""
    g = ""
    if glitch:
        g += f"""
  <g clip-path="url(#{uid}-t)" opacity=".95"><path d="{d}" fill="{PINK}" transform="translate({-shift-7},0)"/><path d="{d}" fill="{GREEN}" transform="translate({-shift+6},0)" opacity=".9"/></g>
  <g clip-path="url(#{uid}-b)" opacity=".95"><path d="{d}" fill="{GREEN}" transform="translate({shift+7},0)" opacity=".9"/><path d="{d}" fill="{PINK}" transform="translate({shift-6},0)"/></g>"""
    g += f"""
  <path d="{d}" fill="{fill_top}" clip-path="url(#{uid}-t)" transform="translate({-shift},0)"/>
  <path d="{d}" fill="{fill_bot}" clip-path="url(#{uid}-b)" transform="translate({shift},0)"/>"""
    if glitch:
        g += f"""
"""
    return s, g

def svg(w, h, defs, body, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs>{DEFS}{defs}</defs>{b}{body}</svg>'

# ---------- 1. main logo -----------------------------------------------------
def main_logo(theme):
    size = 240
    ch = cap_height(size)
    W, H = 1400, 470
    d, tw = text_path("MPHO SAULI", size, 700, tracking=6)
    x0 = (W - tw) / 2
    base = 150 + ch
    d, _ = text_path("MPHO SAULI", size, 700, tracking=6, x=x0, y=base)
    top, bottom = base - ch, base
    mid = top + ch * 0.54
    dark = theme != "light"
    ft, fb = ("url(#ms-fill)", "url(#ms-fill-b)") if dark else ("#0b0b10", "#0b0b10")
    defs, glyphs = sliced(d, top, bottom, mid, 10, 16, ft, fb, "m" + theme, glitch=theme != "mono", solid=None)
    if theme == "mono":
        ft = fb = "#ffffff"
        defs, glyphs = sliced(d, top, bottom, mid, 10, 16, ft, fb, "mm", glitch=False)
    scan = "" if theme == "mono" else f"""
  <rect x="{x0-60}" y="{mid-2}" width="{tw+120}" height="4" fill="url(#ms-scan)" filter="url(#ms-glow)" opacity=".9"/>
  <rect x="{x0-60}" y="{mid-1.5}" width="{tw+120}" height="3" fill="url(#ms-scan)"/>"""
    sd, sw = text_path("DESIGN  STUDIO", 30, 500, tracking=16)
    sx = (W - sw) / 2; sy = bottom + 70
    sd, _ = text_path("DESIGN  STUDIO", 30, 500, tracking=16, x=sx, y=sy)
    sub = PINK if dark else "#b14dff"
    lines = f'<rect x="{x0}" y="{sy-12}" width="{sx-x0-30}" height="2" fill="{sub}"/><rect x="{sx+sw+30}" y="{sy-12}" width="{x0+tw-(sx+sw+30)}" height="2" fill="{sub}"/>'
    if theme == "mono": sub = "#ffffff"; lines = lines.replace(PINK, "#fff")
    body = glyphs + scan + f'<path d="{sd}" fill="{sub}"/>' + lines
    bg = {"dark": "#050507", "light": "#f4f1ec", "mono": None}[theme]
    return svg(W, H, defs, body, bg), svg(W, H, defs, body)

# ---------- 2. MS icon --------------------------------------------------------
def icon():
    S = 1024
    size = 560; ch = cap_height(size)
    d, tw = text_path("MS", size, 700, tracking=-6)
    x0 = (S - tw) / 2; base = (S + ch) / 2 + 10
    d, _ = text_path("MS", size, 700, tracking=-6, x=x0, y=base)
    top, bottom = base - ch, base; mid = top + ch * 0.54
    defs, glyphs = sliced(d, top, bottom, mid, 22, 34, "url(#ms-fill)", "url(#ms-fill-b)", "ic")
    defs += f"""
  <radialGradient id="ic-bg" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#3a1030"/><stop offset=".55" stop-color="#120c22"/><stop offset="1" stop-color="#07070c"/></radialGradient>
  <linearGradient id="ic-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="ic-sq"><rect width="{S}" height="{S}" rx="230"/></clipPath>"""
    body = f"""<g clip-path="url(#ic-sq)"><rect width="{S}" height="{S}" fill="url(#ic-bg)"/>
  <circle cx="{S*.18}" cy="{S*.2}" r="{S*.45}" fill="{PINK}" opacity=".28" filter="url(#ms-glow)"/>
  {glyphs}
  <rect x="40" y="{mid-4}" width="{S-80}" height="8" fill="url(#ms-scan)" filter="url(#ms-glow)"/><rect x="40" y="{mid-3}" width="{S-80}" height="6" fill="url(#ms-scan)"/>
  <rect width="{S}" height="{S}" fill="url(#ic-shine)"/></g>
  <rect x="3" y="3" width="{S-6}" height="{S-6}" rx="228" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="6"/>"""
    return svg(S, S, defs, body)

# ---------- 3. face badge -----------------------------------------------------
def duotone_face():
    im = Image.open(face_path).convert("RGBA")
    w, h = im.size
    # head and shoulders: top ~52% of the cut-out, centred on the face
    crop = im.crop((int(w*.26), 0, int(w*.92), int(h*.50)))
    g = ImageOps.autocontrast(crop.convert("L"), cutoff=2)
    pal = ImageOps.colorize(g, black="#12071f", mid="#ff2d7a", white="#ffe6f1")
    pal.putalpha(crop.getchannel("A"))
    # scanlines baked into the photo
    sl = Image.new("L", pal.size, 255); dr = ImageDraw.Draw(sl)
    for y in range(0, pal.size[1], 6): dr.line([(0, y), (pal.size[0], y)], fill=200, width=2)
    a = Image.composite(pal.getchannel("A"), Image.new("L", pal.size, 0), sl.point(lambda v: 255 if v > 0 else 0))
    pal = Image.merge("RGBA", (*[Image.composite(c, Image.new("L", pal.size, 0), sl) if False else c for c in pal.split()[:3]], pal.getchannel("A")))
    shade = Image.new("RGBA", pal.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(shade)
    for y in range(0, pal.size[1], 6): sd.line([(0, y), (pal.size[0], y)], fill=(5, 5, 7, 70), width=2)
    pal = Image.alpha_composite(pal, Image.composite(shade, Image.new("RGBA", pal.size, (0,0,0,0)), pal.getchannel("A")))
    pal.thumbnail((720, 720))
    buf = io.BytesIO(); pal.save(buf, "PNG", optimize=True)
    return pal.size, base64.b64encode(buf.getvalue()).decode()

def ring_text(s, cx, cy, r, size, start_deg, weight=600, tracking=4):
    f = F[700 if weight > 600 else 500]
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    k = size / f["head"].unitsPerEm
    pen = SVGPathPen(gs)
    ang = math.radians(start_deg)
    for ch in s:
        g = cmap[ord(ch)]; adv = hmtx[g][0] * k
        mid_a = ang + (adv / 2) / r
        px, py = cx + r * math.cos(mid_a), cy + r * math.sin(mid_a)
        rot = mid_a + math.pi / 2
        c, sn = math.cos(rot), math.sin(rot)
        # glyph centred on its advance, baseline on the circle, upright pointing outward
        t = (k * c, k * sn, k * sn, -k * c, px - (adv/2) * c, py - (adv/2) * sn)
        gs[g].draw(TransformPen(pen, t))
        ang += (adv + tracking) / r
    return pen.getCommands()

def badge():
    S = 1024; cx = cy = S / 2
    (fw, fh), b64 = duotone_face()
    scale = (S * .64) / fw
    iw, ih = fw * scale, fh * scale
    ix, iy = cx - iw / 2, cy + S*.36 - ih
    phrase = "MPHO SAULI  ·  DESIGN STUDIO  ·  MPHO SAULI  ·  DESIGN STUDIO  ·  "
    _, plain = text_path(phrase, 50, 500)
    r = S * .41
    track = (2 * math.pi * r - plain) / len(phrase)
    ring = ring_text(phrase, cx, cy, r, 50, -90, weight=500, tracking=track)
    md, mw = text_path("MS", 130, 700)
    mch = cap_height(130)
    md, _ = text_path("MS", 130, 700, x=cx - mw/2, y=cy + S*.39)
    defs = f"""
  <radialGradient id="bd-bg" cx=".5" cy=".38" r=".65"><stop offset="0" stop-color="#3b0f33"/><stop offset=".6" stop-color="#120a22"/><stop offset="1" stop-color="#06060b"/></radialGradient>
  <clipPath id="bd-in"><circle cx="{cx}" cy="{cy}" r="{S*.345}"/></clipPath>
  <linearGradient id="bd-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{PINK}"/><stop offset=".5" stop-color="{VIOLET}"/><stop offset="1" stop-color="{GREEN}"/></linearGradient>"""
    img = f'data:image/png;base64,{b64}'
    body = f"""<circle cx="{cx}" cy="{cy}" r="{S*.5}" fill="#06060b"/>
  <circle cx="{cx}" cy="{cy}" r="{S*.47}" fill="none" stroke="url(#bd-ring)" stroke-width="10"/>
  <path d="{ring}" fill="#ffffff" opacity=".92"/>
  <g clip-path="url(#bd-in)">
    <rect width="{S}" height="{S}" fill="url(#bd-bg)"/>
    <circle cx="{cx}" cy="{cy-40}" r="{S*.26}" fill="{PINK}" opacity=".35" filter="url(#ms-glow)"/>
    <image href="{img}" x="{ix-8}" y="{iy}" width="{iw}" height="{ih}" opacity=".5" filter="url(#bd-g)"/>
    <image href="{img}" x="{ix+8}" y="{iy}" width="{iw}" height="{ih}" opacity=".0"/>
    <image href="{img}" x="{ix}" y="{iy}" width="{iw}" height="{ih}"/>
    <rect x="0" y="{cy+40}" width="{S}" height="5" fill="url(#ms-scan)"/>
  </g>
  <circle cx="{cx}" cy="{cy}" r="{S*.345}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>"""
    defs += f'<filter id="bd-g"><feColorMatrix type="matrix" values="0 0 0 0 .17  0 0 0 0 1  0 0 0 0 .53  0 0 0 1 0"/></filter>'
    return svg(S, S, defs, body)

import os
os.makedirs(out, exist_ok=True)
for t in ("dark", "light", "mono"):
    with_bg, transparent = main_logo(t)
    open(f"{out}/mpho-sauli-logo-{t}.svg", "w").write(transparent)
    open(f"{out}/_preview-logo-{t}.svg", "w").write(with_bg)
open(f"{out}/mpho-sauli-icon.svg", "w").write(icon())
open(f"{out}/mpho-sauli-face-badge.svg", "w").write(badge())
print("ok")
