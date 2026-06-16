<script lang="ts">
  import { PERKS } from '../../content/perks';
  import { fameBonus, fameGain, fameTargetGold, incomePerSecond } from '../../engine/formulas';
  import { perkCost } from '../../engine/perks';
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

  <div class="shop">
    <h3>🏆 Fame Shop</h3>
    <p class="dim">
      Spend Fame on permanent perks. Fame spent here is gone for good — it no longer counts toward
      your production bonus, so weigh each perk against the boost you give up.
    </p>
    {#each PERKS as perk (perk.id)}
      {@const level = game.state.perks[perk.id] ?? 0}
      {@const maxed = level >= perk.maxLevel}
      {@const cost = perkCost(perk, level)}
      {@const affordable = (game.state.balances['fame'] ?? 0) >= cost}
      <div class="perk" class:owned={maxed}>
        <span class="icon">{perk.icon}</span>
        <div class="info">
          <strong>{perk.name} <span class="lvl">Lv {level}/{perk.maxLevel}</span></strong>
          <span class="dim">{perk.description}</span>
        </div>
        {#if maxed}
          <span class="bought">✓ Max</span>
        {:else}
          <button disabled={!affordable} onclick={() => game.buyPerk(perk.id)}>
            🏆 {formatNumber(cost)}
          </button>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  section { display: grid; gap: 18px; padding: 32px; max-width: 480px; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .panel { background: var(--panel); border-radius: var(--radius); padding: 16px; display: grid; gap: 8px; }
  .confirm { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: grid; gap: 10px; }
  .danger { background: #b45309; color: white; padding: 12px 18px; }
  .shop { display: grid; gap: 8px; margin-top: 8px; }
  .shop h3 { font-size: 1rem; margin: 0; }
  .perk { display: flex; align-items: center; gap: 12px; background: var(--panel); border-radius: var(--radius); padding: 12px 14px; }
  .perk.owned { opacity: 0.7; }
  .perk .icon { font-size: 22px; line-height: 1; flex: none; width: 28px; text-align: center; }
  .perk .info { display: grid; flex: 1; gap: 2px; }
  .perk .lvl { color: var(--text-dim); font-weight: 400; font-size: 0.8rem; }
  .perk button { background: var(--accent); color: white; padding: 8px 14px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .perk button:disabled { opacity: 0.4; }
  .bought { color: var(--success); font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
</style>
