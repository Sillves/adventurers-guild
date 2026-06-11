# Leaderboard — plan (nog niet bouwen)

**Status:** voorstel, wacht op go van Lorenz
**Datum:** 2026-06-11

## Doel

Spelers kunnen (opt-in) hun voortgang delen en elkaars voortgang zien op een
leaderboard. Eerste feature die gedeelde state nodig heeft — het spel zelf
blijft volledig client-side.

## Kernbeslissing: een minimale serverless API

Het spel draait op GitHub Pages zonder backend. Een leaderboard vereist iets
server-side; we houden dat zo klein mogelijk: één tabel, twee endpoints.

- `POST /score` — `{ playerId, name, fame, lifetimeGold, prestiges }`, upsert op `playerId`
- `GET /top?limit=50` — gesorteerde lijst

### Hostingopties

| | Cloudflare Worker + D1 (aanbevolen) | Supabase |
|---|---|---|
| Moeite | ~60 regels code, halve dag | ~geen code, een uur |
| Controle | volledig: validatie, rate limiting, sanity checks | beperkt (RLS) |
| Kosten | gratis tier ruim voldoende | gratis, maar pauzeert bij inactiviteit |
| Lock-in | laag (eigen code) | hoger |

**Aanbeveling:** Cloudflare Worker — de validatiecontrole is nodig (zie
valsspelen) en het blijft gratis. Vereist een eigen Cloudflare-account.

## Ontwerpbeslissingen

1. **Ranking-metric:** Fame primair (moeilijkst snel op te blazen), lifetime
   goud als tweede kolom/tiebreaker. Eén rij per speler, geen historiek.
2. **Identiteit zonder accounts:** client genereert een UUID bij eerste opt-in
   (localStorage) + zelfgekozen displaynaam (lengte-gecapt, server-side
   gesanitized). Geen e-mail, geen wachtwoord, geen PII — accounts/cloud saves
   blijven buiten scope zoals in de designspec. Bekende beperking: een save
   importeren op een tweede toestel geeft een tweede leaderboard-entry, tenzij
   we identiteit later in het save-formaat opnemen.
3. **Strikt opt-in:** toggle in het instellingenpaneel ("Share my progress on
   the leaderboard") + naamprompt. Vóór die toggle wordt nooit iets verstuurd.
4. **Verzendritme:** bij elke prestige + verder gethrottled op max. 1× per 5
   minuten. Geen realtime.
5. **Valsspelen — aanvaarden en begrenzen:** het spel is client-side en heeft
   een export/import-feature; elke score is te claimen en client-side signing
   verandert daar niets aan. Voor een vriendenbord is dat oké. De Worker doet
   wel sanity checks zodat knoeien er gebroken uitziet i.p.v. indrukwekkend:
   - fame moet ≈ `floor(sqrt(lifetimeGold / 1M))` zijn (de spelformule)
   - waarden mogen per speler enkel stijgen
   - rate limit per IP
   Echte anti-cheat = server-authoritative simulatie → expliciet buiten scope.

## Clientwerk (geen engine-wijzigingen)

- Nieuwe UI-module `src/ui/leaderboard.ts` (patroon van `sound.ts`/`wakelock.ts`):
  opt-in-state, submit-throttle, fetch met offline-tolerantie. Het spel werkt
  identiek als de API onbereikbaar is.
- **Leaderboard-tab** (5e nav-item, 🏆): top 50, eigen rij gehighlight,
  "laatst bijgewerkt", refresh-knop.
- Instellingenpaneel: opt-in-switch (hergebruik van de bestaande toggle) + naam.

## Fasering

1. **Beslissen** (Lorenz): hosting (aanbeveling: CF Worker) en metric (aanbeveling: Fame)
2. **Backend:** Worker + D1-tabel + curl-tests — ±halve dag
3. **Client:** module + opt-in in instellingen — ±halve dag
4. **UI:** leaderboard-tab — ±halve dag
5. **Playtest** met de groep, daarna sanity-grenzen bijstellen

Totaal: ±twee werksessies. Nieuwe operationele afhankelijkheid: één
Cloudflare-account.

## Buiten scope

- Accounts, cloud saves, vriendenlijsten
- Anti-cheat verder dan sanity checks
- Historiek/grafieken per speler
- Realtime updates
