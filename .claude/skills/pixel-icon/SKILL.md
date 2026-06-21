---
name: pixel-icon
description: Maak eigen CC0 pixel-art iconen (16×16) voor Adventurers Guild, in één samenhangende stijl die bij de Kenney-helden past. Gebruik dit wanneer een emoji of placeholder vervangen moet worden door een handgemaakt pixel-icoon (currencies, upgrades, perks, achievements), of wanneer de gebruiker vraagt om "zelf art te maken / een pixel-icoon te tekenen".
---

# Pixel-icoon maken

Hand-geschreven pixel-art als data → PNG. Volledig **CC0 (eigen werk)**, dus geen
licentiegedoe, en we bepalen zelf het palet → stijl-cohesie met de helden.
Wat hier NIET mee lukt: complexe figuren (draak, archmage) — gebruik daarvoor
een sprite-pack. Wel goed: iconische vormen (munt, ster, zwaard, schild, boek,
potion, kroon, vlam, …).

## Gereedschap
- `scripts/pixelart.py` — het framework (Pillow). Helpers: `new_icon`, `put`,
  `add_outline`, `fill_circle`, `fill_polygon`, `save_previews`, `fit_report`,
  `save_icon`, en het gedeelde palet `P`.
- `scripts/art_icons.py` — uitgewerkte voorbeelden (munt, ster, zwaard, potion).
  Kopieer een functie als startpunt.
- Pillow is vereist (`python3 -c "import PIL"`).

## Werkwijze (volg dit altijd)
1. **Teken** het icoon als functie die een afbeelding teruggeeft:
   ```python
   from pixelart import new_icon, put, add_outline, fill_circle, P
   def shield():
       im = new_icon()
       # ... teken met put(im, x, y, "steel") of put(im, x, y, (r,g,b,255))
       add_outline(im)   # ALTIJD als laatste
       return im
   ```
2. **Houd je aan de conventies** (anders ogen iconen niet als één set):
   - Raster 16×16. Vul de veilige zone van **~14px** (1px marge rondom) zodat
     elk icoon **even groot** oogt.
   - Gebruik het gedeelde palet `P`; voeg kleuren tóe i.p.v. willekeurig kiezen.
   - Belichting komt **linksboven** (highlight linksboven, schaduw rechtsonder).
   - Sluit elke functie af met `add_outline(im)` voor een nette 1px-omtrek.
3. **Controleer grootte**: `fit_report(icons)` — alle spans horen ~14px te zijn.
   Wijkt er een af (zoals een te kleine ster), pas de vorm aan tot het klopt.
4. **Controleer transparantie + look**: `save_previews(icons)` schrijft twee
   vellen naar `/tmp`. Bekijk ze met de Read-tool:
   - `/tmp/preview_magenta.png` — elke ongewenste achtergrond valt op fel magenta
     meteen op (de transparantie moet schoon zijn).
   - `/tmp/preview_navy.png` — hoe het er in de donkere game-UI uitziet.
   Itereer tot het goed staat; laat het de gebruiker zien en vraag akkoord.
5. **Inbouwen** (na akkoord):
   - `save_icon(im, "public/icons/<naam>.png")`.
   - Zet het `icon:`-veld in de content (`src/content/currencies.ts`,
     `upgrades.ts`, `perks.ts`, `achievements.ts`) op `'icons/<naam>.png'`.
     De `<Icon>`-component rendert elk pad met een `/` automatisch als afbeelding.
   - Voeg een changelog-entry toe (zichtbare wijziging) en draai
     `npm test`, `npx svelte-check --threshold error`, `npm run build`.

## Valkuilen (al opgelost in het framework, niet zelf herintroduceren)
- **Omtrek-cascade**: `add_outline` leest uit een `im.copy()`. Teken je de omtrek
  in-place, dan worden nieuwe omtrekpixels zelf weer omlijnd en vloeit de
  omtrekkleur als een vlek over de hele tegel.
- **Niet schalen**: pixel-art nooit met interpolatie opschalen (wordt wazig).
  De preview gebruikt `NEAREST`; in de UI staat `image-rendering: pixelated`
  alleen voor `sprites/` — UI-iconen onder `icons/` renderen glad, dus zet
  pixel-art-iconen ook onder `sprites/` als je het scherpe pixel-effect wil,
  of accepteer de gladde weergave op klein formaat.

## Snel starten
```bash
python3 scripts/art_icons.py      # genereert voorbeelden + previews + grootte-check
```
Bekijk daarna `/tmp/preview_magenta.png` en `/tmp/preview_navy.png`.
