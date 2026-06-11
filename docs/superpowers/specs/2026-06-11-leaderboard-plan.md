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

## Cloud saves & valsspelen — waarom opslag ≠ integriteit

Vraag uit review: "kunnen we niet gewoon cloud saves doen, dan is valsspelen
onmogelijk?" Nee — cloud saves verplaatsen **waar** de data staat, niet **wie**
ze produceert. De client berekent de cijfers; een vervalste save wordt gewoon
geüpload in plaats van lokaal bewaard. De anti-cheat-ladder:

1. **Cloud saves (opslag):** geen integriteitswinst, wél waardevol als feature —
   cross-device spelen ("fix me account" van Ilyes) en backup. Apart plannen.
2. **Plausibiliteits-envelope met "cheated"-label (aanbevolen):** de Worker
   kent de spelformules én we hebben al een perfect-play simulator
   (`scripts/simulate.ts`). I.p.v. onmogelijke scores te weigeren, accepteren
   we alles maar krijgt de speler een publiek label ("cheated") op het bord —
   zichtbaar, grappig, en de vriendengroep handhaaft zelf. Detectieregels:
   - **Servertijdstempels:** de Worker stempelt elke submission bij aankomst;
     klok van de client is irrelevant.
   - **Groei sinds eerste submission, niet absolute waarde:** de eerste
     submission zet een vertrouwde baseline (anders flaggen we legitieme
     save-imports op een tweede toestel); daarna geldt
     `baseline + max haalbare groei in verstreken servertijd` (simulator).
     Absurde eerste submissions (meer dan haalbaar sinds de publieke launch)
     kunnen wél meteen geflagd worden.
   - **Label is sticky per playerId:** één onmogelijke sprong = blijvend label,
     anders wast een cheater het label weg met eerlijke deltas erna. Vers
     beginnen kan met een nieuw ID — en dan ben je je ranking kwijt.
   - **Dalingen niet flaggen:** een oudere save-backup terugzetten is legitiem;
     bewaar het maximum per rij en negeer dips.
   - Formule-consistentie blijft: fame ≈ `floor(sqrt(lifetimeGold / 1M))`.
   - **Labeltekst (beslist):** Engels en grappig — badge **"🤡 Suspiciously
     rich"** naast de naam op het bord. (Alternatieven indien gewenst:
     "Caught red-handed", "Certified cheater".)
3. **Server-authoritative simulatie (enige echte fix, uitgesteld):** server
   houdt de state, client stuurt acties, de pure TS-engine draait server-side
   (kan letterlijk dezelfde code in de Worker zijn). Kost: sync-protocol,
   client prediction, server-enforced offline-cap, conflicthantering — ±5-10×
   het werk van dit plan. Alleen overwegen als het spel de vriendenkring
   ontgroeit.

**Aanbeveling:** leaderboard-validatie = simulator-envelope met publiek
"cheated"-label (punt 2, accepteren + labelen i.p.v. weigeren); cloud saves als
losse feature plannen; punt 3 expliciet uitstellen. Tabel krijgt extra kolommen:
`first_seen_at`, `flagged_at`, `flag_reason`.

## Buiten scope

- Accounts, cloud saves, vriendenlijsten
- Anti-cheat verder dan sanity checks
- Historiek/grafieken per speler
- Realtime updates
