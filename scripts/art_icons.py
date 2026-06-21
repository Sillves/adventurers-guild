"""Definities van de spel-iconen, getekend met het pixelart-framework.

Draaien:  python3 scripts/art_icons.py
- schrijft de 16×16 PNG's naar public/icons/
- schrijft previews naar /tmp (navy + magenta)
- print een grootte-check zodat alle iconen optisch even groot blijven
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pixelart import (new_icon, put, add_outline, fill_circle, fill_polygon,
                      save_previews, save_icon, fit_report, SIZE)


def coin():
    im = new_icon()
    fill_circle(im, 7.5, 7.5, 7.0, "gold", "gold_lt", "gold_dk", ring=7.0 - 2.4)
    put(im, 5, 4, "gold_lt"); put(im, 6, 4, "gold_lt"); put(im, 5, 5, "white")  # glans
    return im


def star():
    # buitenstraal afgestemd zodat de ster ná de omtrek dezelfde ~14px vult
    cx = cy = 7.5
    r_out, r_in = 6.5, 2.8
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    im = new_icon()
    fill_polygon(im, pts, "gold", "gold_lt", "gold_dk")
    add_outline(im)
    return im


def sword():
    # binnen ~13px content gehouden (marge voor de omtrek) -> ná omtrek ~14px
    im = new_icon()
    for i in range(9):                      # kling, linksonder -> rechtsboven
        x, y = 3 + i, 11 - i
        put(im, x, y, "steel")
        put(im, x, y - 1, "steel_lt")
        put(im, x + 1, y, "steel_dk")
    put(im, 12, 2, "steel"); put(im, 11, 2, "steel_lt")   # punt
    for (x, y) in [(2, 11), (3, 12), (1, 10), (4, 13)]:    # pareerstang
        put(im, x, y, "wood")
    put(im, 1, 12, "wood"); put(im, 1, 13, "wood"); put(im, 2, 12, "wood_lt")  # gevest
    add_outline(im)
    return im


def potion():
    # content binnen y2..13 (≈12px) -> ná omtrek ~14px, even groot als de rest
    im = new_icon()
    for y in range(7, 14):                  # romp
        for x in range(4, 12):
            if math.hypot(x - 7.5, y - 10.0) < 3.9:
                put(im, x, y, "green" if (x + y) % 5 else "green_lt")
    for y in range(4, 7):                   # hals
        for x in range(6, 10):
            put(im, x, y, "blue")
    for y in range(2, 4):                   # kurk
        for x in range(6, 10):
            put(im, x, y, "wood")
    put(im, 6, 9, "green_lt"); put(im, 6, 10, "white")     # glans
    add_outline(im)
    return im


ICONS = {"coin": coin(), "star": star(), "sword": sword(), "potion": potion()}

if __name__ == "__main__":
    fit_report(ICONS)
    save_previews(ICONS)
    os.makedirs("public/icons", exist_ok=True)
    # (wiring in de content gebeurt apart; hier alleen genereren)
    for name, im in ICONS.items():
        save_icon(im, f"/tmp/icons_poc/{name}.png")
