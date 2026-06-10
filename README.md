# Adventurers Guild (working title)

A free, browser-based idle clicker: recruit heroes, run quests, refound your guild
for permanent Fame, and (one day) expand into new realms.

## Play
- Web: deployed via GitHub Pages (see Actions)
- itch.io: upload the zipped `dist/` folder

## Develop
```bash
npm install
npm run dev    # local dev server
npm test       # engine + content test suite
npm run build  # production build in dist/
```

## Adding content (no code required)
- New hero/upgrade: add an entry in `src/content/heroes.ts` / `upgrades.ts`
- New currency: add to `src/content/currencies.ts`
- New realm: add to `src/content/realms.ts` (+ heroes/upgrades with that `realmId`)

The content test suite (`src/content/content.test.ts`) validates every entry.

## Architecture
- `src/engine/` — pure TS game logic (immutable state, fully tested)
- `src/content/` — all game data
- `src/ui/` — Svelte 5 components (no game logic)

See `docs/superpowers/specs/2026-06-10-idle-clicker-design.md` for the full design.
