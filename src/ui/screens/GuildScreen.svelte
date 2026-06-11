<script lang="ts">
  import { autoClickPerSecond, clickGain, comboCap, fameGain, fameTargetGold, productionPerSecond } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import GuildYard from '../GuildYard.svelte';

  const gain = $derived(clickGain(game.state).gold ?? 0);
  const maxCombo = $derived(comboCap(game.state.upgrades));
  const comboMult = $derived(game.comboMultiplier);
  const heroRate = $derived(productionPerSecond(game.state)['gold'] ?? 0);
  const autoRate = $derived(autoClickPerSecond(game.state)['gold'] ?? 0);
  const runGold = $derived(game.state.runEarned['gold'] ?? 0);
  const lifetimeGold = $derived(game.state.lifetimeEarned['gold'] ?? 0);
  const fame = $derived(game.state.balances['fame'] ?? 0);
  const nextTarget = $derived(fameTargetGold(fame + 1));
  const prevTarget = $derived(fameTargetGold(fame));
  const prestigeProgress = $derived(
    Math.min(Math.max((lifetimeGold - prevTarget) / (nextTarget - prevTarget), 0), 1),
  );

  interface FloatingGain {
    readonly id: number;
    readonly x: number;
    readonly text: string;
    readonly crit: boolean;
  }

  let floats = $state<FloatingGain[]>([]);
  let nextFloatId = 0;

  function quest(): void {
    const outcome = game.quest();
    const id = nextFloatId++;
    floats = [
      ...floats.slice(-24),
      {
        id,
        x: (Math.random() - 0.5) * 140,
        text: `${outcome.crit ? 'CRIT! ' : ''}+${formatNumber(outcome.gain.gold ?? 0)}`,
        crit: outcome.crit,
      },
    ];
    setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 900);
  }
</script>

<section>
  <h2>Adventurers Guild</h2>
  <p class="dim">Send your guild on quests and recruit heroes to earn gold for you.</p>

  <div class="quest-area">
    <button class="quest" class:frenzy={game.comboHeat >= 1} onclick={quest}>
      <span class="quest-icon">⚔️</span>
      <span>Run quest<br /><small>+{formatNumber(gain * comboMult)} gold</small></span>
    </button>
    {#each floats as f (f.id)}
      <span class="float" class:crit={f.crit} style="left: calc(50% + {f.x}px)">{f.text}</span>
    {/each}
  </div>

  {#if maxCombo > 1}
    <div class="combo" class:hot={game.comboHeat >= 1}>
      <div class="combo-bar"><div class="combo-fill" style="width: {game.comboHeat * 100}%"></div></div>
      <span class="combo-label">Combo ×{comboMult.toFixed(1)}</span>
    </div>
  {/if}

  <GuildYard />

  <div class="stats">
    <div>Earned this guild era: <strong>{formatNumber(runGold)}</strong> gold</div>
    {#if game.clickIncomeRate > 0 || autoRate > 0 || heroRate > 0}
      <div class="sources dim">
        {#if game.clickIncomeRate > 0}<span>⚔️ your clicks <strong>+{formatNumber(game.clickIncomeRate)}/s</strong></span>{/if}
        {#if autoRate > 0}<span>📯 auto-quests <strong>+{formatNumber(autoRate)}/s</strong></span>{/if}
        {#if heroRate > 0}<span>🧙 heroes <strong>+{formatNumber(heroRate)}/s</strong></span>{/if}
      </div>
    {/if}
    {#if fameGain(game.state) === 0}
      <div class="dim">
        Next Fame: <strong class="lifetime">{formatNumber(lifetimeGold)}</strong> / {formatNumber(nextTarget)} lifetime gold
      </div>
      <div class="bar"><div class="fill" style="width: {prestigeProgress * 100}%"></div></div>
    {:else}
      <div class="success">👑 Prestige available — check the Prestige tab!</div>
    {/if}
  </div>
</section>

<style>
  section { display: grid; gap: 20px; justify-items: center; padding: 32px; text-align: center; }
  .lifetime { color: var(--gold); font-weight: 600; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .quest {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 34px;
    font-size: 1.2rem;
    background: var(--accent);
    color: white;
    border-radius: 999px;
    box-shadow: 0 4px 20px rgb(59 130 246 / 0.5);
  }
  .quest:active { transform: scale(0.97); }
  .quest.frenzy { box-shadow: 0 4px 24px rgb(245 158 11 / 0.7); }
  .quest-icon { font-size: 2rem; }
  .combo { display: flex; align-items: center; gap: 10px; width: min(280px, 100%); }
  .combo-bar {
    flex: 1;
    background: var(--panel-raised);
    border-radius: 999px;
    height: 8px;
    overflow: hidden;
  }
  .combo-fill {
    background: linear-gradient(90deg, var(--accent), var(--gold));
    height: 100%;
    /* geen transition: de breedte volgt de heat per frame al vloeiend */
  }
  .combo-label {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    min-width: 4.5em;
    text-align: left;
  }
  .combo.hot .combo-label { color: var(--gold); font-weight: 600; }
  .quest-area { position: relative; }
  .float {
    position: absolute;
    top: -6px;
    transform: translateX(-50%);
    color: var(--text);
    font-weight: 600;
    pointer-events: none;
    animation: float-up 0.9s ease-out forwards;
    white-space: nowrap;
  }
  .float.crit {
    color: var(--gold);
    font-size: 1.3rem;
  }
  @keyframes float-up {
    from { translate: 0 0; opacity: 1; }
    to { translate: 0 -48px; opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .float { animation-duration: 0.5s; }
  }
  .stats { display: grid; gap: 8px; width: min(420px, 100%); }
  .sources {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
  .sources strong { color: var(--gold); font-weight: 600; }
  .bar { background: var(--panel-raised); border-radius: 999px; height: 10px; overflow: hidden; }
  .fill { background: var(--success); height: 100%; }
</style>
