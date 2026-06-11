// Genereert worker/envelope.json: per uur het maximum aan lifetime goud dat
// met eerlijke play haalbaar is, over MEERDERE strategieën heen — nooit
// prestigen wint vroeg (heroes/upgrades compounden zonder reset), doubling
// wint laat (fame compoundt harder). De Worker gebruikt het per-uur maximum
// (×4 marge) als plausibiliteits-envelope voor leaderboard-submissions.
//
//   npx vite-node scripts/generate-envelope.ts
//
import { writeFileSync } from 'node:fs';
import { HEROES } from '../src/content/heroes';
import { UPGRADES } from '../src/content/upgrades';
import { advance } from '../src/engine/advance';
import * as commands from '../src/engine/commands';
import { clickGain, critParams, fameGain, heroCost, isUpgradeUnlocked } from '../src/engine/formulas';
import { scaleMap } from '../src/engine/maps';
import { createInitialState, type GameState } from '../src/engine/state';

const DAYS = 60;
const STEP_SECONDS = 5;
// snelle menselijke tikker; daarboven is het een autoclicker en mag de 🤡 komen
const CLICKS_PER_SECOND = 8;
// extra marge voor strategieën die de bots niet kennen en toekomstige buffs
const SAFETY_FACTOR = 4;

type PrestigePolicy = (gain: number, fame: number) => boolean;

function simulate(shouldPrestige: PrestigePolicy): number[] {
  let state: GameState = createInitialState(0);
  const hourly: number[] = [];
  let t = 0;
  const maxSeconds = DAYS * 86400;
  let nextSample = 0;

  while (t < maxSeconds) {
    state = advance(state, STEP_SECONDS);
    const { chance, multiplier } = critParams(state.upgrades);
    const avgCrit = 1 + chance * (multiplier - 1);
    state = commands.earn(
      state,
      scaleMap(clickGain(state), CLICKS_PER_SECOND * STEP_SECONDS * avgCrit),
    );
    t += STEP_SECONDS;

    for (;;) {
      let bestCost = Infinity;
      let buy: (() => GameState) | null = null;
      for (const hero of HEROES) {
        const cost = heroCost(hero, state.heroes[hero.id] ?? 0)['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyHero(state, hero.id);
        }
      }
      for (const upgrade of UPGRADES) {
        if (state.upgrades.includes(upgrade.id)) continue;
        if (!isUpgradeUnlocked(upgrade, state.upgrades)) continue;
        const cost = upgrade.cost['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyUpgrade(state, upgrade.id);
        }
      }
      if (buy === null || (state.balances['gold'] ?? 0) < bestCost) break;
      state = buy();
    }

    const gain = fameGain(state);
    if (gain >= 1 && shouldPrestige(gain, state.balances['fame'] ?? 0)) {
      state = commands.doPrestige(state, t * 1000);
    }

    if (t >= nextSample) {
      hourly.push(state.lifetimeEarned['gold'] ?? 0);
      nextSample += 3600;
    }
  }
  return hourly;
}

const strategies: Record<string, PrestigePolicy> = {
  'nooit prestigen': () => false,
  'prestige bij verdubbeling': (gain, fame) => gain >= Math.max(1, fame),
  'prestige zodra mogelijk': () => true,
};

const curves = Object.entries(strategies).map(([label, policy]) => {
  const curve = simulate(policy);
  console.log(`${label}: 24h ${curve[24]?.toExponential(2)}, eind ${curve.at(-1)?.toExponential(2)}`);
  return curve;
});

const length = Math.min(...curves.map((c) => c.length));
const envelope = Array.from({ length }, (_, i) =>
  Math.ceil(Math.max(...curves.map((c) => c[i])) * SAFETY_FACTOR),
);

writeFileSync('worker/envelope.json', JSON.stringify(envelope));
console.log(`worker/envelope.json: ${envelope.length} uursamples, eindwaarde ${envelope.at(-1)?.toExponential(2)}`);
