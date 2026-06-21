"""Herbruikbaar mini-framework om CC0 pixel-art iconen te tekenen (eigen werk).

Gebruik (zie .claude/skills/pixel-icon/SKILL.md):
    from pixelart import new_icon, put, add_outline, P, save_icon, save_previews, fit_report

    def coin():
        im = new_icon()
        ...            # teken met put(im, x, y, kleur)
        add_outline(im)
        return im

    icons = {"coin": coin()}
    save_previews(icons)          # /tmp/preview_navy.png + _magenta.png
    fit_report(icons)             # controleer dat alle iconen ~even groot zijn
    save_icon(icons["coin"], "public/icons/coin.png")

Ontwerp-conventies (voor stijl-cohesie):
  * Raster is SIZE×SIZE (16). Vul de "veilige zone" van ~14×14 met 1px marge,
    zodat ELK icoon optisch even groot oogt (zie fit_report).
  * Gebruik het gedeelde palet P; voeg kleuren toe i.p.v. willekeurig te kiezen.
  * Belichting komt uit de linkerbovenhoek: highlights linksboven, schaduw
    rechtsonder.
  * Roep altijd add_outline(im) als laatste aan voor een nette 1px-omtrek.
"""
from PIL import Image
import math

SIZE = 16
TARGET_SPAN = 14  # gewenste content-grootte binnen het 16×16-raster
TRANSPARENT = (0, 0, 0, 0)

# Gedeeld palet — hou hier álle iconen binnen voor een samenhangende stijl.
P = {
    "outline":  (40, 28, 12, 255),
    "gold":     (217, 165, 33, 255), "gold_lt": (245, 215, 110, 255), "gold_dk": (168, 120, 26, 255),
    "steel":    (200, 210, 225, 255), "steel_lt": (240, 245, 255, 255), "steel_dk": (120, 130, 150, 255),
    "wood":     (120, 80, 40, 255),  "wood_lt": (160, 110, 60, 255),
    "green":    (70, 180, 90, 255),  "green_lt": (150, 230, 160, 255),
    "red":      (200, 60, 60, 255),  "red_lt": (240, 120, 120, 255), "red_dk": (150, 35, 35, 255),
    "blue":     (90, 170, 210, 255), "blue_lt": (170, 220, 245, 255),
    "purple":   (150, 90, 200, 255), "purple_lt": (200, 160, 240, 255),
    "white":    (255, 255, 255, 255),
}


def new_icon():
    return Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)


def put(im, x, y, color):
    """Zet één pixel. `color` is een RGBA-tuple of een sleutel uit P."""
    if 0 <= x < SIZE and 0 <= y < SIZE:
        im.putpixel((int(x), int(y)), P[color] if isinstance(color, str) else color)


def add_outline(im, color="outline"):
    """1px-omtrek rond ondoorzichtige pixels.

    Leest uit een MOMENTOPNAME (im.copy()): anders worden zojuist getekende
    omtrekpixels zélf weer omlijnd en vloeit de omtrekkleur als een vlek over
    de hele tegel (de bug die we eerder zagen).
    """
    c = P[color] if isinstance(color, str) else color
    base = im.copy()
    for y in range(SIZE):
        for x in range(SIZE):
            if base.getpixel((x, y))[3] > 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < SIZE and 0 <= ny < SIZE and base.getpixel((nx, ny))[3] == 0 and im.getpixel((nx, ny))[3] == 0:
                        im.putpixel((nx, ny), c)


def fill_circle(im, cx, cy, r, base, light, dark, ring=None):
    """Gevulde, belichte schijf — handig voor munten/orbs."""
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy)
            if d > r + 0.3:
                continue
            if d > r - 1.0:
                put(im, x, y, "outline"); continue
            if ring is not None and abs(d - ring) < 0.6:
                put(im, x, y, dark); continue
            t = (cx - x) + (cy - y)
            put(im, x, y, light if t > 3 else dark if t < -3 else base)


def fill_polygon(im, pts, base, light, dark):
    """Gevulde, belichte veelhoek (scanline). pts = lijst van (x, y)."""
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    n = len(pts)

    def inside(px_, py_):
        c = 0
        for i in range(n):
            x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
            if (y1 > py_) != (y2 > py_):
                if px_ < (x2 - x1) * (py_ - y1) / (y2 - y1) + x1:
                    c += 1
        return c % 2 == 1

    for y in range(SIZE):
        for x in range(SIZE):
            if inside(x + 0.5, y + 0.5):
                t = (cx - x) + (cy - y)
                put(im, x, y, light if t > 2 else dark if t < -2 else base)


def content_span(im):
    """Grootste afmeting (breedte of hoogte) van de niet-transparante inhoud."""
    xs, ys = [], []
    for y in range(SIZE):
        for x in range(SIZE):
            if im.getpixel((x, y))[3] > 0:
                xs.append(x); ys.append(y)
    if not xs:
        return 0
    return max(max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)


def fit_report(icons):
    """Print de content-grootte per icoon; alles hoort dicht bij TARGET_SPAN te
    liggen zodat de iconen optisch even groot zijn. Waarschuwt bij uitschieters."""
    print(f"Grootte-check (doel ~{TARGET_SPAN}px):")
    for name, im in icons.items():
        span = content_span(im)
        flag = "" if abs(span - TARGET_SPAN) <= 1 else "  <-- WIJKT AF, bijstellen"
        print(f"  {name:10s} {span}px{flag}")


def _sheet(icons, path, bg, scale=6, pad=8):
    n = len(icons)
    s = Image.new("RGBA", (n * (SIZE * scale) + (n + 1) * pad, SIZE * scale + 2 * pad), bg)
    for i, im in enumerate(icons.values()):
        big = im.resize((SIZE * scale, SIZE * scale), Image.NEAREST)
        s.alpha_composite(big, (pad + i * (SIZE * scale + pad), pad))
    s.save(path)


def save_previews(icons, outdir="/tmp"):
    """Twee voorbeeldvellen: navy (in-game look) en magenta (transparantie-check
    — elke ongewenste achtergrond valt meteen op)."""
    _sheet(icons, f"{outdir}/preview_navy.png", (15, 23, 42, 255))
    _sheet(icons, f"{outdir}/preview_magenta.png", (255, 0, 255, 255))
    print(f"Previews: {outdir}/preview_navy.png  &  {outdir}/preview_magenta.png")


def save_icon(im, path):
    im.save(path)
    print(f"Opgeslagen: {path}")
