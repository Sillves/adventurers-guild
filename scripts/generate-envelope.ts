// Genereert worker/envelope.json: per uur het maximum aan lifetime goud dat
// met perfecte play haalbaar is (doubling-prestige bot, 3 kliks/s, crits als
// verwachtingswaarde), met ruime veiligheidsmarge. De Worker gebruikt dit als
// plausibiliteits-envelope voor leaderboard-submissions.
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
const CLICKS_PER_SECOND = 3;
// marge voor autoclickers, betere strategieën dan de bot en toekomstige buffs
const SAFETY_FACTOR = 4;

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

  // prestige bij minstens verdubbeling van fame (snelste bekende strategie)
  const gain = fameGain(state);
  if (gain >= Math.max(1, state.balances['fame'] ?? 0)) {
    state = commands.doPrestige(state, t * 1000);
  }

  if (t >= nextSample) {
    hourly.push(Math.ceil((state.lifetimeEarned['gold'] ?? 0) * SAFETY_FACTOR));
    nextSample += 3600;
  }
}

writeFileSync('worker/envelope.json', JSON.stringify(hourly));
console.log(`worker/envelope.json: ${hourly.length} uursamples, eindwaarde ${hourly.at(-1)?.toExponential(2)}`);
