# Audio assets (all CC0 / free)

The game works fine without audio files (missing audio is silently skipped).

## Current SFX (generated)

`click.wav`, `buy.wav` and `prestige.wav` are synthesized by `scripts/generate-audio.py`
(Python stdlib, no dependencies) — fully rights-free since we generate them ourselves.
Regenerate with:

```bash
python scripts/generate-audio.py
```

## Upgrading to nicer sounds (optional)

Replace the generated files with CC0 sounds and update `src/ui/sound.ts` paths if the
extension changes:

| File | Suggested source |
|------|-----------------|
| `click.wav` | Kenney "Interface Sounds" — https://kenney.nl/assets/interface-sounds (CC0) |
| `buy.wav` | Kenney "Interface Sounds" — pick a "confirmation" sound (CC0) |
| `prestige.wav` | Kenney "Jingles" — https://kenney.nl/assets?q=jingles (CC0) |
| `music.ogg` | Any CC0 loop, e.g. search https://opengameart.org for "medieval loop CC0" — not included yet |

Keep files small (< 1 MB total preferred). Update `docs/CREDITS.md` when adding files.
