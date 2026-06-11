<script lang="ts">
  import { clickGain, fameGain, fameTargetGold } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import GuildYard from '../GuildYard.svelte';

  const gain = $derived(clickGain(game.state).gold ?? 0);
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
    <button class="quest" onclick={quest}>
      <span class="quest-icon">⚔️</span>
      <span>Run quest<br /><small>+{formatNumber(gain)} gold</small></span>
    </button>
    {#each floats as f (f.id)}
      <span class="float" class:crit={f.crit} style="left: calc(50% + {f.x}px)">{f.text}</span>
    {/each}
  </div>

  <GuildYard />

  <div class="stats">
    <div>Earned this guild era: <strong>{formatNumber(runGold)}</strong> gold</div>
    {#if fameGain(game.state) === 0}
      <div class="dim">Reach {formatNumber(nextTarget)} lifetime gold for your next Fame</div>
      <div class="bar"><div class="fill" style="width: {prestigeProgress * 100}%"></div></div>
    {:else}
      <div class="success">👑 Prestige available — check the Prestige tab!</div>
    {/if}
  </div>
</section>

<style>
  section { display: grid; gap: 20px; justify-items: center; padding: 32px; text-align: center; }
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
  .quest-icon { font-size: 2rem; }
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
  .bar { background: var(--panel-raised); border-radius: 999px; height: 10px; overflow: hidden; }
  .fill { background: var(--success); height: 100%; }
</style>
