<script lang="ts">
  import { clickGain, fameGain, PRESTIGE_THRESHOLD_GOLD } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';

  const gain = $derived(clickGain(game.state).gold ?? 0);
  const runGold = $derived(game.state.runEarned['gold'] ?? 0);
  const prestigeProgress = $derived(Math.min(runGold / PRESTIGE_THRESHOLD_GOLD, 1));
</script>

<section>
  <h2>Adventurers Guild</h2>
  <p class="dim">Send your guild on quests and recruit heroes to earn gold for you.</p>

  <button class="quest" onclick={() => game.quest()}>
    <span class="quest-icon">⚔️</span>
    <span>Run quest<br /><small>+{formatNumber(gain)} gold</small></span>
  </button>

  <div class="stats">
    <div>Earned this guild era: <strong>{formatNumber(runGold)}</strong> gold</div>
    {#if fameGain(game.state) === 0}
      <div class="dim">Reach {formatNumber(PRESTIGE_THRESHOLD_GOLD)} gold to unlock prestige</div>
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
  .stats { display: grid; gap: 8px; width: min(420px, 100%); }
  .bar { background: var(--panel-raised); border-radius: 999px; height: 10px; overflow: hidden; }
  .fill { background: var(--success); height: 100%; }
</style>
