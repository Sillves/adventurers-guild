# Design: Avonturiersgilde — Idle Clicker (werknaam)

**Datum:** 2026-06-10
**Status:** Goedgekeurd door gebruiker (brainstormsessie)

## Doel & context

Een gratis idle clicker game, gebouwd om (1) echte spelers te bereiken, (2) game-development te leren en (3) als portfolio-stuk te dienen. Monetisatie is een mogelijke latere stap, geen v1-doel. Alle gebruikte resources (assets, audio, tooling) zijn gratis.

**Releasepad:** eerst gratis op het web (GitHub Pages) en itch.io; bij succes een Steam-release (eenmalige Steam Direct fee van $100) via een Tauri-wrapper.

## Game-ontwerp

**Thema:** avonturiersgilde. De speler bouwt een gilde uit door helden te werven die zelfstandig goud verdienen.

**Kernloop (klassiek incremental):**
1. Klik op "Quest uitvoeren" → direct goud.
2. Koop helden → automatische goudproductie per seconde.
3. Koop upgrades → multipliers op klik of specifieke helden.
4. Prestige ("Gilde heroprichten") → reset tegen permanente Roem-bonus.

**Content v1:**
- **8 helden**, oplopend in kosten en productie: Boerenknecht → Schildknaap → Krijger → Boogschutter → Magiër → Paladijn → Drakentemmer → Aartsmagiër.
- **±20 upgrades**, eenmalige aankopen met effecten als `{ target: 'hero:warrior', multiplier: 2 }`.
- **2 valuta:** Goud (kernloop) en Roem (prestige). Het systeem ondersteunt onbeperkt extra valuta.
- **1 rijk:** alle v1-content hoort bij het startrijk. Het datamodel ondersteunt meerdere rijken (zie Uitbreidbaarheid); een tweede rijk is v2-content.

**Formules:**
- Heldkosten: `kosten = basisKosten × 1.15^aantalInBezit`
- Prestige: beschikbaar vanaf 1.000.000 totaal verdiend goud; Roem-opbrengst: `roem = floor(sqrt(totaalVerdiendGoud / 1.000.000))`, waarbij `totaalVerdiendGoud` het goud over **alle era's heen** is (lifetime, overleeft resets) en je bij een refound het verschil krijgt met al verdiende Roem. Het n-de Roem-punt vergt dus n² × 1M lifetime goud — telkens opnieuw 1M grinden levert niets op. Elke Roem geeft +2% productie, permanent over resets heen. (Exacte tuning mag tijdens implementatie bijgesteld worden, de formulevorm staat vast.)

**Offline progress:** bij het laden wordt het tijdsverschil sinds de laatste save berekend en als goud uitgekeerd (cap: 8 uur), gepresenteerd in een "Welkom terug!"-popup.

**Audio:** klik-feedback, koopgeluid, prestige-fanfare, één rustige achtergrondloop. Bronnen: Kenney Audio / freesound.org (CC0).

## Uitbreidbaarheid (kerneis)

Nieuwe valuta, helden, upgrades en rijken toevoegen mag nooit engine- of UI-wijzigingen vereisen. Alle content staat als data in `src/content/` (TypeScript-arrays met `as const`). De engine itereert generiek over deze lijsten; kosten en productie zijn multi-currency maps (`{ gold: 15 }`). Saves bewaren alleen aantallen per id, zodat oude saves blijven werken wanneer content wordt toegevoegd.

**Rijken:** elk rijk is een content-entry in `realms.ts` met een naam, thema-accentkleur en een unlock-voorwaarde (bijv. `{ minFame: 10 }`). Elke held en upgrade hoort bij een rijk (`realmId`). De UI toont vergrendelde rijken als teaser en rendert per rijk generiek dezelfde schermen; de sidebar krijgt een rijk-wisselaar zodra er meer dan één rijk ontgrendeld is. Een tweede rijk toevoegen = één entry in `realms.ts` plus helden/upgrades met dat `realmId` — geen code.

## Architectuur

**Stack:** TypeScript, Svelte 5, Vite, Vitest. Geen backend; alles client-side.

**Lagen:**
- `src/engine/` — pure TypeScript, geen Svelte/DOM. Tick-loop, formules, save/load, offline-berekening. Volledig unit-testbaar.
- `src/content/` — data-definities: `currencies.ts`, `realms.ts`, `heroes.ts`, `upgrades.ts`.
- `src/ui/` — Svelte-componenten. Lezen state, sturen commando's ("koop held X"). Geen spellogica.

**Tick-loop:** `requestAnimationFrame` voor weergave; logica rekent met delta-tijd via één functie `advance(state, seconds)`. Dezelfde functie verwerkt offline-tijd (één aanroep met het verstreken aantal seconden, gecapt op 8 uur). Eén codepad voor online en offline progressie.

**State:** immutable updates — `advance` en commando's geven een nieuwe state terug in plaats van te muteren.

## UI-ontwerp

**Stijl:** modern flat / icon-stijl. Donker thema, afgeronde panelen, systeemfont. Iconen van game-icons.net (4.000+ gratis SVG-iconen in één consistente stijl) — geen zelfgetekende assets nodig.

**Layout:** sidebar met tabs (Melvor-stijl): navigatie links (Gilde, Helden, Upgrades, Prestige) met valutateller onderin de sidebar; één focus-scherm per onderwerp. Gekozen vanwege schaalbaarheid bij toekomstige systemen en valuta. Op mobiel wordt de sidebar een tab-balk.

**Schermen v1:**
- **Gilde** — quest-knop (handmatig klikken), productie-overzicht, voortgang naar volgende mijlpaal.
- **Helden** — lijst met werfbare helden, aantallen, kosten, productie; vergrendelde helden als teaser zichtbaar.
- **Upgrades** — raster met koopbare upgrades; gekochte gedimd/afgevinkt.
- **Prestige** — uitleg, huidige Roem, te verdienen Roem bij heroprichting, bevestigingsknop.

## Save-systeem & foutafhandeling

- Save naar `localStorage` als JSON met `version`-veld; migratiefuncties per versie.
- Atomair schrijven: serialiseren en valideren vóór wegschrijven.
- Twee roterende backups; bij corrupte save terugvallen op laatste werkende backup — nooit stilletjes resetten.
- Onbekende id's in een save worden genegeerd met console-warning, nooit een crash.
- Auto-save elke 30 seconden en bij het sluiten van de tab.
- Export/import van saves als tekst-string (voor spelers én voor de latere Steam-port).
- Alle save-logica achter één interface, zodat `localStorage` later inwisselbaar is voor bestandsopslag + Steam Cloud.

## Testen

- **Engine (zwaartepunt):** Vitest-unittests voor kostencurves, productieberekening, `advance()` met grote tijdsprongen, prestige-berekening en save-migraties.
- **Content-validatie:** test die alle definities controleert: geldige icon-ids, positieve kosten, verwijzingen naar bestaande currencies. Een typefout in nieuwe content breekt de build, niet de game.
- **UI:** licht getest; de waarde zit in de engine.

## Distributie

- `vite build` → statische map.
- **itch.io:** zip uploaden, speelt embedded in de browser (gratis).
- **GitHub Pages:** gratis hosting als directe speellink.
- **Steam (later):** dezelfde build in Tauri wrappen; save-interface omwisselen naar bestandsopslag + Steam Cloud; achievements toevoegen.

## Buiten scope v1

- Tweede rijk (v2 — puur content dankzij het rijken-datamodel)
- Achievements (v2, herbruikbaar voor Steam)
- Monetisatie
- Meertaligheid (v1 is Engelstalig voor maximaal bereik)
- Accounts/cloud saves
