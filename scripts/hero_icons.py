"""Batch 2: signatuur-wapeniconen per held (pixel-art, CC0 eigen werk).

Eén icoon per held, toegepast op al z'n upgrade-tiers + legioenen.
Draaien: python3 scripts/hero_icons.py [--write]
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pixelart import (new_icon, put, add_outline, fill_polygon,
                      save_previews, save_icon, fit_report)

PAGE = (235, 225, 190, 255); PAGE_D = (200, 185, 145, 255)
BOOK = (150, 90, 200, 255); BOOK_D = (110, 60, 155, 255)
STR = (220, 225, 235, 255)


def pitchfork():  # farmhand
    im = new_icon()
    for y in range(6, 14):                        # steel
        put(im, 7, y, "wood"); put(im, 8, y, "wood_lt")
    for x in (4, 7, 11):                           # 3 tanden
        for y in range(2, 7):
            put(im, x, y, "steel" if y > 2 else "steel_lt")
        put(im, x + 1 if x < 7 else x, 2, "steel_lt")
    for x in range(4, 12):                          # dwarsbalk
        put(im, x, 6, "steel_dk")
    add_outline(im); return im


def shield():  # squire
    im = new_icon()
    rows = {2: (4, 12), 3: (3, 13), 4: (3, 13), 5: (3, 13), 6: (4, 12),
            7: (4, 12), 8: (5, 11), 9: (5, 11), 10: (6, 10), 11: (6, 10), 12: (7, 9)}
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1):
            edge = x == x0 or x == x1 - 1
            put(im, x, y, "steel" if edge else "blue_lt" if x < 7 else "blue")
    for y in range(3, 11):                          # middenribbel
        put(im, 7, y, "steel_lt"); put(im, 8, y, "steel")
    add_outline(im); return im


def sword():  # warrior
    im = new_icon()
    for i in range(9):                              # kling
        x, y = 3 + i, 11 - i
        put(im, x, y, "steel"); put(im, x, y - 1, "steel_lt"); put(im, x + 1, y, "steel_dk")
    put(im, 12, 2, "steel"); put(im, 11, 2, "steel_lt")
    for (x, y) in [(2, 11), (3, 12), (1, 10), (4, 13)]:
        put(im, x, y, "wood")
    put(im, 1, 12, "wood"); put(im, 1, 13, "wood"); put(im, 2, 12, "wood_lt")
    add_outline(im); return im


def bow():  # archer
    im = new_icon()
    for y in range(2, 14):                          # houten boog (arc links)
        dx = round(3.2 * math.sin((y - 2) / 11 * math.pi))
        put(im, 3 + dx, y, "wood"); put(im, 4 + dx, y, "wood_lt")
    for y in range(3, 13):                          # pees
        put(im, 4, y, STR)
    for x in range(5, 14):                          # pijl
        put(im, x, 7, "wood_lt")
    put(im, 13, 6, "steel_lt"); put(im, 13, 8, "steel_lt"); put(im, 14, 7, "steel")  # punt
    put(im, 5, 6, "steel"); put(im, 5, 8, "steel")  # veren
    add_outline(im); return im


def spellbook():  # mage
    im = new_icon()
    for y in range(3, 14):                          # kaft
        for x in range(3, 12):
            put(im, x, y, BOOK_D if x < 5 else BOOK)
    for y in range(4, 13):                          # bladzijden (rechterrand)
        put(im, 11, y, PAGE); put(im, 10, y, PAGE_D if y % 2 else PAGE)
    cx, cy, ro, ri = 7.0, 8.0, 2.6, 1.1            # rune-ster op de kaft
    pts = [(cx + math.cos(-math.pi / 2 + i * math.pi / 5) * (ro if i % 2 == 0 else ri),
            cy + math.sin(-math.pi / 2 + i * math.pi / 5) * (ro if i % 2 == 0 else ri)) for i in range(10)]
    fill_polygon(im, pts, "gold", "gold_lt", "gold_dk")
    add_outline(im); return im


ICONS = {"pitchfork": pitchfork(), "shield": shield(), "sword": sword(),
         "bow": bow(), "spellbook": spellbook()}

if __name__ == "__main__":
    fit_report(ICONS)
    save_previews(ICONS)
    if "--write" in sys.argv:
        os.makedirs("public/sprites", exist_ok=True)
        for n, im in ICONS.items():
            save_icon(im, f"public/sprites/{n}.png")
