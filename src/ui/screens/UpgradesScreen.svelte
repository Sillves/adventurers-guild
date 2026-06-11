<script lang="ts">
  import { UPGRADES } from '../../content/upgrades';
  import { isUpgradeUnlocked } from '../../engine/formulas';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const realmUpgrades = $derived(
    [...UPGRADES.filter((u) => u.realmId === realmId)].sort((a, b) => (a.cost.gold ?? 0) - (b.cost.gold ?? 0)),
  );

  function requiresName(id: string): string {
    return UPGRADES.find((u) => u.id === id)?.name ?? id;
  }
</script>

<section>
  <h2>Upgrades</h2>
  <div class="grid">
    {#each realmUpgrades as upgrade (upgrade.id)}
      {@const purchased = game.state.upgrades.includes(upgrade.id)}
      {@const locked = !isUpgradeUnlocked(upgrade, game.state.upgrades)}
      <button
        class="tile"
        class:purchased
        class:locked
        disabled={purchased || locked || !canAfford(game.state.balances, upgrade.cost)}
        onclick={() => game.buyUpgrade(upgrade.id)}
        title={upgrade.description}
      >
        <Icon icon={upgrade.icon} size={26} />
        <strong>{upgrade.name}</strong>
        <span class="dim">{upgrade.description}</span>
        {#if purchased}
          <span class="cost">✓ Purchased</span>
        {:else if locked}
          <span class="cost dim">🔒 Requires {requiresName(upgrade.requires ?? '')}</span>
        {:else}
          <span class="cost">🪙 {formatNumber(upgrade.cost.gold ?? 0)}</span>
        {/if}
      </button>
    {/each}
  </div>
</section>

<style>
  section { padding: 24px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }
  .tile {
    display: grid;
    gap: 6px;
    justify-items: start;
    text-align: left;
    background: var(--panel);
    padding: 14px;
    border-radius: var(--radius);
  }
  .tile.purchased { opacity: 0.45; }
  .tile.locked { opacity: 0.55; border: 1px dashed var(--border); }
  .dim { color: var(--text-dim); font-size: 0.8rem; }
  .cost { color: var(--gold); font-size: 0.85rem; }
</style>
