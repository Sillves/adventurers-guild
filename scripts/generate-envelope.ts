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
import { PERKS } from '../src/content/perks';
import { UPGRADES } from '../src/content/upgrades';
import { advance } from '../src/engine/advance';
import * as commands from '../src/engine/commands';
import { clickGain, comboCap, critParams, fameGain, heroCost, incomePerSecond, isUpgradeUnlocked } from '../src/engine/formulas';
import { scaleMap } from '../src/engine/maps';
import { frenzyPerkBonus, heroCostMultiplier, perkCost, raidIntervalMultiplier } from '../src/engine/perks';
import { createInitialState, type GameState } from '../src/engine/state';

const DAYS = 60;
const STEP_SECONDS = 5;
// snelle menselijke tikker; daarboven is het een autoclicker en mag de 🤡 komen
const CLICKS_PER_SECOND = 8;
// extra marge voor strategieën die de bots niet kennen en toekomstige buffs
const SAFETY_FACTOR = 4;

type PrestigePolicy = (gain: number, fame: number) => boolean;

function simulate(shouldPrestige: PrestigePolicy, startFame = 0, buyPerks = false): number[] {
  let state: GameState = createInitialState(0);
  if (startFame > 0) {
    state = { ...state, balances: { ...state.balances, fame: startFame } };
  }
  const hourly: number[] = [];
  let t = 0;
  const maxSeconds = DAYS * 86400;
  let nextSample = 0;

  while (t < maxSeconds) {
    state = advance(state, STEP_SECONDS);
    const { chance, multiplier } = critParams(state.upgrades);
    const avgCrit = 1 + chance * (multiplier - 1);
    // 8 kliks/s houdt de combo-heat permanent vol, dus de bot klikt op de cap
    state = commands.earn(
      state,
      scaleMap(clickGain(state), CLICKS_PER_SECOND * STEP_SECONDS * avgCrit * comboCap(state.upgrades)),
    );
    t += STEP_SECONDS;

    // raid-buit: een verdediger op maximale cadans (elke 10 min) wint 5 min
    // inkomen plus frenzy-extra. War Spoils maakt de frenzy sterker en Call to
    // Arms de raids frequenter — beide vouwen we in de buit zodat de envelope
    // ook een geüpgradede raid-speler als plafond dekt.
    if (t % 600 === 0 && (state.balances['fame'] ?? 0) >= 50) {
      const frenzyFactor = 2 + frenzyPerkBonus(state.perks);
      const lootSeconds = (300 + 60 * (frenzyFactor - 1)) / raidIntervalMultiplier(state.perks);
      state = commands.earn(state, scaleMap(incomePerSecond(state), lootSeconds));
    }

    for (;;) {
      let bestCost = Infinity;
      let buy: (() => GameState) | null = null;
      for (const hero of HEROES) {
        const cost = heroCost(hero, state.heroes[hero.id] ?? 0, heroCostMultiplier(state.perks))['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyHero(state, hero.id);
        }
      }
      for (const upgrade of UPGRADES) {
        if (state.upgrades.includes(upgrade.id)) continue;
        if (!isUpgradeUnlocked(upgrade, state)) continue;
        const cost = upgrade.cost['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyUpgrade(state, upgrade.id);
        }
      }
      if (buy === null || (state.balances['gold'] ?? 0) < bestCost) break;
      state = buy();
    }

    // perk-spelers spenderen Fame aan permanente boosts. Niet greedy (dat sloopt
    // de passieve Fame-bonus en onderschat de echte max), maar gedisciplineerd:
    // koop een niveau alleen als het ≤5% van je huidige Fame kost. Dat is de
    // (bijna) optimale strategie uit de balanssimulatie — zo dekt de envelope
    // een sláimme perk-speler, niet alleen een naïeve.
    if (buyPerks) {
      for (;;) {
        let bought = false;
        const fame = state.balances['fame'] ?? 0;
        for (const perk of PERKS) {
          const level = state.perks[perk.id] ?? 0;
          if (level >= perk.maxLevel || perkCost(perk, level) > fame * 0.05) continue;
          const next = commands.buyPerk(state, perk.id);
          if (next !== state) {
            state = next;
            bought = true;
          }
        }
        if (!bought) break;
      }
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

const strategies: Record<string, { policy: PrestigePolicy; startFame?: number; buyPerks?: boolean }> = {
  'nooit prestigen': { policy: () => false },
  'prestige bij verdubbeling': { policy: (gain, fame) => gain >= Math.max(1, fame) },
  'prestige zodra mogelijk': { policy: () => true },
  // veteranen van vóór de fame-knie spelen met een gebankte ×61-multiplier door;
  // zonder deze curve zou de envelope hen na de balanswijziging vals flaggen
  'veteraan (3000 fame gebankt), nooit prestigen': { policy: () => false, startFame: 3000 },
  // perk-maxers: dezelfde policies maar mét gekochte Fame-perks. De productie- en
  // klik-perks tillen het haalbare lifetime goud lategame ver omhoog (×15 op dag 30);
  // zonder deze curves flagt de envelope een eerlijke perk-speler na ~1 week.
  'prestige bij verdubbeling + perks': { policy: (gain, fame) => gain >= Math.max(1, fame), buyPerks: true },
  'prestige zodra mogelijk + perks': { policy: () => true, buyPerks: true },
  'veteraan (3000 fame) + perks': { policy: () => false, startFame: 3000, buyPerks: true },
};

const curves = Object.entries(strategies).map(([label, { policy, startFame, buyPerks }]) => {
  const curve = simulate(policy, startFame ?? 0, buyPerks ?? false);
  console.log(`${label}: 24h ${curve[24]?.toExponential(2)}, eind ${curve.at(-1)?.toExponential(2)}`);
  return curve;
});

const length = Math.min(...curves.map((c) => c.length));
const envelope = Array.from({ length }, (_, i) =>
  Math.ceil(Math.max(...curves.map((c) => c[i])) * SAFETY_FACTOR),
);

writeFileSync('worker/envelope.json', JSON.stringify(envelope));
console.log(`worker/envelope.json: ${envelope.length} uursamples, eindwaarde ${envelope.at(-1)?.toExponential(2)}`);
