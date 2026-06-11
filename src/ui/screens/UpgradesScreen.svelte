<script lang="ts">
  import type { UpgradeDef } from '../../content/types';
  import { UPGRADES } from '../../content/upgrades';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  // Upgrades met een requires-keten vormen één kaart met levels: je ziet
  // altijd alleen de eerstvolgende tier, nooit duurdere duplicaten ernaast.
  const chains = $derived.by(() => {
    const realm = UPGRADES.filter((u) => u.realmId === realmId);
    const childOf = new Map<string, UpgradeDef>();
    for (const u of realm) {
      if (u.requires !== undefined) childOf.set(u.requires, u);
    }
    return realm
      .filter((u) => u.requires === undefined)
      .map((head) => {
        const tiers: UpgradeDef[] = [head];
        let cur = head;
        while (childOf.has(cur.id)) {
          cur = childOf.get(cur.id)!;
          tiers.push(cur);
        }
        return tiers;
      });
  });

  function levelOf(tiers: readonly UpgradeDef[]): number {
    let level = 0;
    while (level < tiers.length && game.state.upgrades.includes(tiers[level].id)) level += 1;
    return level;
  }

  // sorteer op de prijs van de eerstvolgende tier; volledig gekochte ketens achteraan
  const sorted = $derived(
    [...chains].sort((a, b) => {
      const nextA = a[levelOf(a)];
      const nextB = b[levelOf(b)];
      if (nextA === undefined && nextB === undefined) return 0;
      if (nextA === undefined) return 1;
      if (nextB === undefined) return -1;
      return (nextA.cost.gold ?? 0) - (nextB.cost.gold ?? 0);
    }),
  );
</script>

<section>
  <h2>Upgrades</h2>
  <div class="grid">
    {#each sorted as tiers (tiers[0].id)}
      {@const level = levelOf(tiers)}
      {@const maxed = level >= tiers.length}
      {@const shown = maxed ? tiers[tiers.length - 1] : tiers[level]}
      <button
        class="tile"
        class:purchased={maxed}
        disabled={maxed || !canAfford(game.state.balances, shown.cost)}
        onclick={() => game.buyUpgrade(shown.id)}
        title={shown.description}
      >
        <div class="head">
          <Icon icon={shown.icon} size={26} />
          {#if tiers.length > 1}
            <span class="level">Lv {level}/{tiers.length}</span>
          {/if}
        </div>
        <strong>{shown.name}</strong>
        <span class="dim">{shown.description}</span>
        <span class="cost">{maxed ? '✓ Max level' : `🪙 ${formatNumber(shown.cost.gold ?? 0)}`}</span>
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
  .head { display: flex; align-items: center; justify-content: space-between; width: 100%; }
  .level {
    font-size: 0.75rem;
    color: var(--text-dim);
    background: var(--panel-raised);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .dim { color: var(--text-dim); font-size: 0.8rem; }
  .cost { color: var(--gold); font-size: 0.85rem; }
</style>
