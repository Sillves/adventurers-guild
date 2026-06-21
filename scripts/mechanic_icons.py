"""Batch 3: iconen voor de actieve-mechaniek-upgrades (pixel-art, CC0 eigen werk).

  click        -> scroll   (quest-kracht)
  click-synergy-> banner   (helden doen mee)
  click-crit   -> sparkle  (kritieke treffer)
  click-combo  -> drum     (ritme/combo)
  auto-click   -> horn     (heraut roept quests)

Draaien: python3 scripts/mechanic_icons.py [--write]
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pixelart import (new_icon, put, add_outline, save_previews, save_icon, fit_report)

PAGE = (236, 226, 192, 255); PAGE_D = (200, 184, 142, 255); ROLL = (170, 144, 100, 255); INK = (120, 95, 60, 255)
FLAG = (74, 134, 208, 255); FLAG_L = (140, 188, 236, 255); EMB = (245, 214, 84, 255)
DRUM = (202, 72, 60, 255); DRUM_D = (150, 42, 42, 255); HOOP = (224, 196, 150, 255); LACE = (244, 232, 180, 255)


def line(im, x0, y0, x1, y1, color):  # Bresenham, voor diagonale details
    dx, dy = abs(x1 - x0), abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx - dy
    while True:
        put(im, x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy; x0 += sx
        if e2 < dx:
            err += dx; y0 += sy


def scroll():  # click — horizontaal perkament met opgerolde uiteinden
    im = new_icon()
    for y in range(4, 12):                          # vel
        for x in range(4, 12):
            put(im, x, y, PAGE_D if y in (4, 11) else PAGE)
    for ty in (6, 8, 10):                            # schone tekstlijnen
        for x in range(5, 11):
            put(im, x, ty, INK)
    for y in range(3, 13):                           # opgerolde uiteinden (cilinders)
        put(im, 2, y, ROLL); put(im, 3, y, PAGE)
        put(im, 13, y, ROLL); put(im, 12, y, PAGE)
    for x in (2, 3, 12, 13):                          # krul afronden
        put(im, x, 3, PAGE_D); put(im, x, 12, PAGE_D)
    add_outline(im); return im


def banner():  # click-synergy — wapperende vlag met zwaluwstaart
    im = new_icon()
    for y in range(2, 15):                           # mast
        put(im, 3, y, "wood_lt"); put(im, 2, y, "wood")
    for y in range(2, 10):                           # vlag, zwaluwstaart rechts
        right = 13 if abs(y - 6) >= 2 else 10        # inkeping in het midden
        for x in range(4, right):
            put(im, x, y, FLAG_L if y < 6 else FLAG)
    for (x, y) in [(7, 5), (8, 5), (7, 6), (8, 6), (6, 6), (9, 5)]:  # gouden ruit-embleem
        put(im, x, y, EMB)
    add_outline(im); return im


def sparkle():  # click-crit — 4-puntige fonkeling + glinster
    im = new_icon()
    for y in range(16):
        for x in range(16):
            dx, dy = abs(x - 7.5), abs(y - 7.5)
            v = dx <= max(0.0, 1 - dy / 6.6) * 2.6
            h = dy <= max(0.0, 1 - dx / 6.6) * 2.6
            if v or h:
                near = dx + dy
                put(im, x, y, "white" if near < 1.6 else "gold_lt" if near < 4 else "gold")
    for (x, y) in [(12, 3), (13, 3), (12, 2)]:        # kleine tweede glinster
        put(im, x, y, "gold_lt")
    add_outline(im); return im


def drum():  # click-combo — zijaanzicht-trommel met diagonale rijging
    im = new_icon()
    for y in range(3, 14):
        r = 1 if y in (3, 13) else 0
        for x in range(3 + r, 13 - r):
            put(im, x, y, HOOP if y in (3, 4, 12, 13) else (DRUM if (x + y) % 2 else DRUM_D))
    xs = [4, 6, 8, 10, 12]                            # V-zigzag tussen de hoepels
    for i in range(len(xs) - 1):
        a, b = (5, 11) if i % 2 == 0 else (11, 5)
        line(im, xs[i], a, xs[i + 1], b, LACE)
    add_outline(im); return im


def horn():  # auto-click — heraut-bugel: mondstuk -> uitlopende bel
    im = new_icon()
    put(im, 2, 7, "gold_dk"); put(im, 2, 8, "gold_dk")        # mondstuk
    for x in range(3, 7):                            # smalle buis
        put(im, x, 7, "gold_lt"); put(im, x, 8, "gold")
    for x in range(7, 14):                           # bel, breder naar rechts
        half = int((x - 6) * 0.75)
        for y in range(7 - half, 9 + half):
            put(im, x, y, "gold_lt" if y < 7 else "gold_dk" if y > 8 else "gold")
    for y in range(2, 14):                           # blinkende belrand
        if abs(y - 7.5) < 5.6:
            put(im, 13, y, "gold_lt")
    add_outline(im); return im


ICONS = {"scroll": scroll(), "banner": banner(), "sparkle": sparkle(),
         "drum": drum(), "horn": horn()}

if __name__ == "__main__":
    fit_report(ICONS)
    save_previews(ICONS)
    if "--write" in sys.argv:
        os.makedirs("public/sprites", exist_ok=True)
        for n, im in ICONS.items():
            save_icon(im, f"public/sprites/{n}.png")
