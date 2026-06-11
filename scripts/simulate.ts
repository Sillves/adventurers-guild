// Balans-simulatie: speelt het echte engine-spel versneld door met een bot,
// en rapporteert hoe lang era's en prestiges duren.
//
//   npx vite-node scripts/simulate.ts
//
import { HEROES } from '../src/content/heroes';
import { UPGRADES } from '../src/content/upgrades';
import { advance } from '../src/engine/advance';
import * as commands from '../src/engine/commands';
import { clickGain, critParams, fameGain, heroCost } from '../src/engine/formulas';
import { scaleMap } from '../src/engine/maps';
import { createInitialState, type GameState } from '../src/engine/state';
import { formatNumber } from '../src/ui/format';

interface PrestigeEvent {
  readonly n: number;
  readonly atSeconds: number;
  readonly eraSeconds: number;
  readonly gain: number;
  readonly fameAfter: number;
  readonly lifetimeGold: number;
}

interface SimResult {
  readonly label: string;
  readonly prestiges: PrestigeEvent[];
  readonly heroFirsts: ReadonlyArray<{ id: string; atSeconds: number }>;
  readonly endSeconds: number;
  readonly capped: boolean;
}

function fmt(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d${Math.floor((seconds % 86400) / 3600)}h`;
}

/**
 * Bot: koopt telkens de goedkoopste beschikbare hero/upgrade (redelijke proxy
 * voor menselijk spel) en prestiget volgens shouldPrestige.
 */
function simulate(
  label: string,
  clicksPerSecond: number,
  shouldPrestige: (gain: number, fame: number) => boolean,
  prestigeTarget: number,
  maxDays: number,
): SimResult {
  let state: GameState = createInitialState(0);
  const prestiges: PrestigeEvent[] = [];
  const heroFirsts: Array<{ id: string; atSeconds: number }> = [];
  const seenHeroes = new Set<string>();
  const maxSeconds = maxDays * 86400;
  let t = 0;
  let eraStart = 0;

  while (prestiges.length < prestigeTarget && t < maxSeconds) {
    state = advance(state, 1);
    if (clicksPerSecond > 0) {
      // crits gemodelleerd als verwachtingswaarde: 1 + kans × (multiplier − 1)
      const { chance, multiplier } = critParams(state.upgrades);
      const avgCrit = 1 + chance * (multiplier - 1);
      state = commands.earn(state, scaleMap(clickGain(state), clicksPerSecond * avgCrit));
    }
    t += 1;

    // koop greedy de goedkoopste optie zolang er iets betaalbaar is
    for (;;) {
      let bestCost = Infinity;
      let buy: (() => GameState) | null = null;
      let boughtHero: string | null = null;
      for (const hero of HEROES) {
        const cost = heroCost(hero, state.heroes[hero.id] ?? 0)['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyHero(state, hero.id);
          boughtHero = hero.id;
        }
      }
      for (const upgrade of UPGRADES) {
        if (state.upgrades.includes(upgrade.id)) continue;
        const cost = upgrade.cost['gold'] ?? Infinity;
        if (cost < bestCost) {
          bestCost = cost;
          buy = () => commands.buyUpgrade(state, upgrade.id);
          boughtHero = null;
        }
      }
      if (buy === null || (state.balances['gold'] ?? 0) < bestCost) break;
      state = buy();
      if (boughtHero !== null && !seenHeroes.has(boughtHero)) {
        seenHeroes.add(boughtHero);
        heroFirsts.push({ id: boughtHero, atSeconds: t });
      }
    }

    const gain = fameGain(state);
    if (gain >= 1 && shouldPrestige(gain, state.balances['fame'] ?? 0)) {
      const fameAfter = (state.balances['fame'] ?? 0) + gain;
      prestiges.push({
        n: prestiges.length + 1,
        atSeconds: t,
        eraSeconds: t - eraStart,
        gain,
        fameAfter,
        lifetimeGold: state.lifetimeEarned['gold'] ?? 0,
      });
      state = commands.doPrestige(state, t * 1000);
      eraStart = t;
    }
  }

  return { label, prestiges, heroFirsts, endSeconds: t, capped: t >= maxSeconds };
}

function report(result: SimResult): void {
  console.log(`\n=== ${result.label} ===`);
  if (result.heroFirsts.length > 0) {
    console.log('  Eerste era — held-unlocks:');
    for (const h of result.heroFirsts) console.log(`    ${fmt(h.atSeconds).padStart(8)}  ${h.id}`);
  }
  console.log('  Prestiges:');
  console.log('     #   na (totaal)   era-duur     +fame   fame   lifetime goud');
  for (const p of result.prestiges) {
    console.log(
      `    ${String(p.n).padStart(2)}   ${fmt(p.atSeconds).padStart(11)}   ${fmt(p.eraSeconds).padStart(8)}   ${String(p.gain).padStart(5)}   ${String(p.fameAfter).padStart(4)}   ${formatNumber(p.lifetimeGold).padStart(8)}`,
    );
  }
  if (result.capped) console.log(`  ⚠️ gestopt op de tijdslimiet (${fmt(result.endSeconds)})`);
}

const TARGET = 8;
const MAX_DAYS = 60;

// Actieve speler: ~3 kliks/s, prestiget zodra er ook maar 1 fame te halen valt
report(simulate('Actief (3 kliks/s), prestige zodra mogelijk', 3, () => true, TARGET, MAX_DAYS));

// Actieve speler die wacht tot prestige zijn fame minstens verdubbelt
report(simulate('Actief (3 kliks/s), prestige bij verdubbeling', 3, (gain, fame) => gain >= Math.max(1, fame), TARGET, MAX_DAYS));

// Idle speler: klikt amper (0.2/s), prestiget zodra mogelijk
report(simulate('Idle (0.2 kliks/s), prestige zodra mogelijk', 0.2, () => true, TARGET, MAX_DAYS));
