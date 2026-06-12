<script lang="ts">
  import { fameBonus, fameGain, fameTargetGold, incomePerSecond } from '../../engine/formulas';
  import { formatEta, formatNumber } from '../format';
  import { game } from '../game.svelte';

  const currentFame = $derived(game.state.balances['fame'] ?? 0);
  const gain = $derived(fameGain(game.state));
  const lifetimeGold = $derived(game.state.lifetimeEarned['gold'] ?? 0);
  const nextTarget = $derived(fameTargetGold(currentFame + gain + 1));
  const etaSeconds = $derived.by(() => {
    const rate = (incomePerSecond(game.state)['gold'] ?? 0) + game.clickIncomeRate;
    if (rate <= 0) return null;
    return Math.max(0, nextTarget - lifetimeGold) / rate;
  });
  let confirming = $state(false);

  function prestige(): void {
    game.prestige();
    confirming = false;
  }
</script>

<section>
  <h2>👑 Refound the Guild</h2>
  <p class="dim">
    Refounding resets your gold, heroes and upgrades — but earns permanent <strong>Fame</strong>.
    Every Fame point boosts all production and quests, forever — early points count the heaviest.
  </p>

  <div class="panel">
    <div>Current Fame: <strong>🏆 {formatNumber(currentFame)}</strong> (+{formatNumber((fameBonus(currentFame) - 1) * 100)}% production)</div>
    <div>Lifetime gold: <strong>🪙 {formatNumber(lifetimeGold)}</strong></div>
    <div>Fame on refound: <strong class="success">+{formatNumber(gain)}</strong></div>
    <p class="dim">
      Next Fame point at {formatNumber(nextTarget)} lifetime gold — each point costs more than the
      last.{#if etaSeconds !== null}{' '}At your current rate: <strong>~{formatEta(etaSeconds)}</strong>.{/if}
    </p>
  </div>

  {#if confirming}
    <div class="confirm">
      <p>Reset this era for <strong>+{formatNumber(gain)} Fame</strong>?</p>
      <button class="danger" onclick={prestige}>Yes, refound the guild</button>
      <button onclick={() => (confirming = false)}>Cancel</button>
    </div>
  {:else}
    <button class="danger" disabled={gain === 0} onclick={() => (confirming = true)}>
      Refound the guild
    </button>
  {/if}
</section>

<style>
  section { display: grid; gap: 18px; padding: 32px; max-width: 480px; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .panel { background: var(--panel); border-radius: var(--radius); padding: 16px; display: grid; gap: 8px; }
  .confirm { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: grid; gap: 10px; }
  .danger { background: #b45309; color: white; padding: 12px 18px; }
</style>
