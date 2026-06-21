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


def drum():  # click-combo — tapse conga-drum met vel en X-touwrijging
    im = new_icon()
    BODY, BODY_D, BODY_L = (160, 76, 46, 255), (116, 50, 32, 255), (188, 100, 64, 255)
    HEAD, HEAD_D, ROPE = (228, 204, 154, 255), (190, 164, 118, 255), (238, 220, 172, 255)

    def half(y):
        h = 4.4 * (1 - (y - 4) / 10.0) + 2.6 * ((y - 4) / 10.0)
        return h * (1 - (y - 12) * 0.22) if y >= 13 else h
    for y in range(4, 15):                            # tapse romp + afgeronde bodem
        hw = half(y)
        for x in range(16):
            if abs(x - 7.5) <= hw:
                put(im, x, y, BODY_L if x - 7.5 < -hw + 1.5 else BODY_D if x - 7.5 > hw - 2 else BODY)
    for x in range(16):                                # vel-ellips bovenop
        for y in range(2, 5):
            if ((x - 7.5) / 4.4) ** 2 + ((y - 3.2) / 1.8) ** 2 <= 1:
                put(im, x, y, HEAD if y < 4 else HEAD_D)
    for x in range(3, 12):                              # rand onder het vel
        if abs(x - 7.5) <= 4.3:
            put(im, x, 4, HEAD_D)
    line(im, 4, 5, 11, 10, ROPE); line(im, 11, 5, 4, 10, ROPE)    # bovenste X
    line(im, 5, 10, 9, 14, ROPE); line(im, 10, 10, 6, 14, ROPE)   # onderste X
    add_outline(im); return im


def horn():  # auto-click — gebogen strijdhoorn (bel rechtsboven, punt linksonder)
    im = new_icon()
    G, GL, GD = (228, 172, 42, 255), (250, 212, 92, 255), (168, 118, 24, 255)
    BAND, BAND_L, MOUTH = (120, 135, 165, 255), (172, 188, 212, 255), (165, 92, 28, 255)
    samples = []                                     # gebogen middellijn met taps toelopende straal
    for i in range(61):
        t = i / 60
        x = (1 - t) ** 2 * 11.0 + 2 * (1 - t) * t * 6.0 + t ** 2 * 2.5
        y = (1 - t) ** 2 * 6.0 + 2 * (1 - t) * t * 10.0 + t ** 2 * 12.0
        r = 2.3 * (1 - t) + 0.7 * t
        samples.append((x, y, r, t))
    for px in range(16):
        for py in range(16):
            for (cx, cy, r, t) in samples:
                if (px - cx) ** 2 + (py - cy) ** 2 <= r * r:
                    if (0.34 < t < 0.42) or (0.48 < t < 0.56):   # twee blauwe banden
                        put(im, px, py, BAND_L if (px + py) % 2 else BAND)
                    else:
                        put(im, px, py, GL if (px < cx - 0.2 and py < cy + 0.4) else GD if px > cx + 0.7 else G)
                    break
    bx, by = 11.5, 4.2                               # uitlopende bel + donkere opening
    for px in range(16):
        for py in range(16):
            d = ((px - bx) / 3.6) ** 2 + ((py - by) / 3.0) ** 2
            if d <= 0.45 and px > bx - 2.5:
                put(im, px, py, MOUTH)
            elif 0.45 < d <= 1.05:
                put(im, px, py, GL)
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
