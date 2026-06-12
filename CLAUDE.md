# Adventurers Guild — project rules

- **Changelog**: every PR that changes something players can see or feel (feature, balance change, visible fix) adds an entry to the TOP of `src/content/changelog.ts` — player-facing language, include the PR number(s). Internal-only changes (CI, refactors, anti-cheat tuning) stay out. Never remove or reorder entries; the unread counter depends on the order.
- Balance changes: regenerate `worker/envelope.json` via `npx vite-node scripts/generate-envelope.ts`.
- Save-schema changes: bump `SAVE_VERSION` + add a migration in `src/engine/save.ts`.
- Verify before PR: `npm test`, `npx svelte-check --threshold error`, `npm run build`.
