"""Batch 3: iconen voor de actieve-mechaniek-upgrades (pixel-art, CC0 eigen werk).

Eén icoon per effect-type, toegepast op alle bijbehorende upgrades:
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

PAGE = (235, 225, 190, 255); PAGE_D = (198, 182, 140, 255); ROLL = (175, 150, 105, 255)
FLAG = (80, 140, 210, 255); FLAG_L = (150, 195, 240, 255)
DRUM = (200, 70, 60, 255); DRUM_D = (150, 40, 40, 255); SKIN = (232, 205, 150, 255)


def scroll():  # click
    im = new_icon()
    for y in range(5, 12):                          # perkament
        for x in range(4, 12):
            put(im, x, y, PAGE if y in (5, 11) or x in (4, 11) else (PAGE if (x + y) % 4 else PAGE_D))
    for tx in range(4, 12):                          # tekstlijnen
        if tx not in (4, 11): put(im, tx, 7, PAGE_D); put(im, tx, 9, PAGE_D)
    for y in range(4, 13):                           # opgerolde uiteinden
        put(im, 2, y, ROLL); put(im, 3, y, PAGE_D)
        put(im, 13, y, ROLL); put(im, 12, y, PAGE_D)
    add_outline(im); return im


def banner():  # click-synergy
    im = new_icon()
    for y in range(2, 14):                           # mast
        put(im, 4, y, "wood_lt"); put(im, 5, y, "wood")
    for y in range(2, 9):                            # vlag
        for x in range(6, 13):
            inner = abs(y - 5) <= (12 - x)           # zwaluwstaart-inkeping rechts
            if inner: put(im, x, y, FLAG_L if y < 5 else FLAG)
    put(im, 7, 4, (245, 220, 90, 255)); put(im, 8, 4, (245, 220, 90, 255))  # embleem
    add_outline(im); return im


def sparkle():  # click-crit (4-puntige fonkeling)
    im = new_icon()
    for y in range(16):
        for x in range(16):
            dx, dy = abs(x - 7.5), abs(y - 7.5)
            # twee gekruiste lensvormen -> bolle 4-punt-ster met 1px-tips op de rand
            v = dx <= max(0.0, 1 - dy / 6.6) * 2.6
            h = dy <= max(0.0, 1 - dx / 6.6) * 2.6
            if v or h:
                near = dx + dy
                put(im, x, y, "white" if near < 1.6 else "gold_lt" if near < 4 else "gold")
    add_outline(im); return im


def drum():  # click-combo (zijaanzicht-trommel: hoepels + rood vel + rijgwerk)
    im = new_icon()
    for y in range(3, 14):
        r = 1 if y in (3, 13) else 0                  # licht afgeronde hoeken
        for x in range(3 + r, 13 - r):
            if y in (3, 4, 12, 13):
                put(im, x, y, SKIN)                   # tan hoepels boven/onder
            else:
                put(im, x, y, DRUM if (x + y) % 2 else DRUM_D)  # rood vel
    LACE = (240, 230, 175, 255)
    for x in range(4, 12):                            # V-rijgwerk tussen de hoepels
        ly = 6 if x % 2 == 0 else 10
        put(im, x, ly, LACE)
        put(im, x, 8, LACE)
    add_outline(im); return im


def horn():  # auto-click (heraut-hoorn)
    im = new_icon()
    for x in range(3, 14):                            # kegel: smal links -> bel rechts
        half = int((x - 3) * 0.55)
        for y in range(7 - half, 8 + half):
            put(im, x, y, "gold_lt" if y < 7 else "gold_dk" if y > 8 else "gold")
    for y in range(2, 13):                            # belrand rechts
        if abs(y - 7.5) < 5.2: put(im, 13, y, "gold_lt")
    put(im, 2, 7, "gold_dk"); put(im, 2, 8, "gold_dk")  # mondstuk
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
