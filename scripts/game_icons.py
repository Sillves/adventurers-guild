"""Echte spel-iconen (pixel-art, CC0 eigen werk), getekend met het framework.

Batch 1: currencies (gold, fame) + de 6 Fame-perks.
Draaien: python3 scripts/game_icons.py  -> schrijft naar public/sprites/ + preview.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pixelart import (new_icon, put, add_outline, fill_circle, fill_polygon,
                      save_previews, save_icon, fit_report, SIZE)

# extra kleuren (binnen de stijl)
SKIN = (232, 180, 130, 255); SKIN_D = (190, 135, 90, 255)
MOON = (240, 232, 185, 255); MOON_L = (255, 252, 228, 255)
FY = (255, 224, 92, 255); FO = (245, 150, 40, 255); FR = (212, 70, 38, 255)
BAG = (172, 122, 72, 255); BAG_D = (128, 88, 50, 255); BAG_L = (202, 152, 96, 255)


def coin():
    im = new_icon()
    fill_circle(im, 7.5, 7.5, 7.0, "gold", "gold_lt", "gold_dk", ring=7.0 - 2.4)
    put(im, 5, 4, "gold_lt"); put(im, 6, 4, "gold_lt"); put(im, 5, 5, "white")
    return im


def fame():  # ster
    cx = cy = 7.5; ro, ri = 6.5, 2.8
    pts = [(cx + math.cos(-math.pi / 2 + i * math.pi / 5) * (ro if i % 2 == 0 else ri),
            cy + math.sin(-math.pi / 2 + i * math.pi / 5) * (ro if i % 2 == 0 else ri)) for i in range(10)]
    im = new_icon(); fill_polygon(im, pts, "gold", "gold_lt", "gold_dk"); add_outline(im)
    return im


def mighty():  # vuist (quest-klikkracht)
    im = new_icon()
    for y in range(4, 14):                       # handpalm/romp
        for x in range(3, 12):
            put(im, x, y, SKIN if (x + y) % 6 else SKIN_D)
    for x in (4, 6, 8, 10):                       # 4 knokkels bovenaan
        put(im, x, 3, SKIN)
    for x in (5, 7, 9):                           # vingergroeven
        for y in range(4, 9):
            put(im, x, y, SKIN_D)
    put(im, 2, 9, SKIN); put(im, 2, 10, SKIN); put(im, 3, 10, SKIN_D)  # duim links
    put(im, 4, 5, MOON_L)                         # kleine glans
    add_outline(im); return im


def seasoned():  # oplopende balken (productie)
    im = new_icon()
    for (bx, ty) in [(3, 11), (7, 8), (11, 5)]:  # 3 hogere balken
        for y in range(ty, 14):
            for x in range(bx, bx + 3):
                put(im, x, y, "green" if (x + y) % 5 else "green_lt")
    add_outline(im); return im


def night():  # wassende maan
    im = new_icon()
    for y in range(SIZE):
        for x in range(SIZE):
            if math.hypot(x - 7.0, y - 7.5) < 6.3 and math.hypot(x - 10.2, y - 6.0) > 5.7:
                t = (7.0 - x) + (7.5 - y)
                put(im, x, y, MOON_L if t > 2 else MOON)
    add_outline(im); return im


def thrifty():  # geldzak (heldenkorting)
    im = new_icon()
    for y in range(6, 15):
        for x in range(2, 14):
            if math.hypot(x - 7.5, y - 10.2) < 5.6:
                put(im, x, y, BAG if (x + y) % 5 else BAG_L)
    for x in range(6, 10):                       # dichtgeknoopte hals
        put(im, x, 3, BAG_D); put(im, x, 4, BAG)
    for (x, y) in [(7, 9), (7, 10), (7, 11), (6, 9), (8, 11), (8, 9), (6, 11)]:  # $-teken
        put(im, x, y, "gold_lt")
    add_outline(im); return im


def call_to_arms():  # strijdbijl
    im = new_icon()
    for y in range(2, 14):                       # verticale steel
        put(im, 9, y, "wood"); put(im, 10, y, "wood_lt")
    # bijlkop links: groot blad dat naar links uitbult (de snijkant)
    blade = {2: (7, 9), 3: (5, 9), 4: (4, 9), 5: (3, 9), 6: (3, 9), 7: (4, 9), 8: (5, 9), 9: (7, 9)}
    for y, (x0, x1) in blade.items():
        for x in range(x0, x1):
            put(im, x, y, "steel_lt" if x <= 3 else "steel_dk" if x >= 8 else "steel")
    add_outline(im); return im


def war_spoils():  # vlam
    im = new_icon()
    for y in range(2, 14):
        w = int((y - 1) * 0.45)
        for x in range(7 - w, 8 + w):
            put(im, x, y, FY if y < 6 else FO if y < 10 else FR)
    for y in range(8, 13):                        # hete kern
        put(im, 7, y, FY)
    add_outline(im); return im


ICONS = {
    "coin": coin(), "fame": fame(), "perk-mighty": mighty(), "perk-seasoned": seasoned(),
    "perk-night": night(), "perk-thrifty": thrifty(), "perk-call": call_to_arms(),
    "perk-spoils": war_spoils(),
}

if __name__ == "__main__":
    fit_report(ICONS)
    save_previews(ICONS)
    if "--write" in sys.argv:
        os.makedirs("public/sprites", exist_ok=True)
        for n, im in ICONS.items():
            save_icon(im, f"public/sprites/{n}.png")
