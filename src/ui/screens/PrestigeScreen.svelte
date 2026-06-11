<script lang="ts">
  import { fameGain, fameTargetGold, FAME_BONUS_PER_POINT } from '../../engine/formulas';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';

  const currentFame = $derived(game.state.balances['fame'] ?? 0);
  const gain = $derived(fameGain(game.state));
  const lifetimeGold = $derived(game.state.lifetimeEarned['gold'] ?? 0);
  const nextTarget = $derived(fameTargetGold(currentFame + gain + 1));
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
    Each Fame point boosts all production and quests by {FAME_BONUS_PER_POINT * 100}%, forever.
  </p>

  <div class="panel">
    <div>Current Fame: <strong>🏆 {formatNumber(currentFame)}</strong> (+{formatNumber(currentFame * FAME_BONUS_PER_POINT * 100)}% production)</div>
    <div>Lifetime gold: <strong>🪙 {formatNumber(lifetimeGold)}</strong></div>
    <div>Fame on refound: <strong class="success">+{formatNumber(gain)}</strong></div>
    <p class="dim">
      Next Fame point at {formatNumber(nextTarget)} lifetime gold — each point costs more than the last.
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
