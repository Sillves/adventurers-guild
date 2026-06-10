<script lang="ts">
  import { HEROES } from '../../content/heroes';
  import { fameBonus, heroCost, heroMultiplier } from '../../engine/formulas';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const realmHeroes = $derived(HEROES.filter((h) => h.realmId === realmId));

  function ownedCount(heroId: string): number {
    return game.state.heroes[heroId] ?? 0;
  }

  const visibleCount = $derived.by(() => {
    let count = 1;
    while (count < realmHeroes.length && ownedCount(realmHeroes[count - 1].id) > 0) count += 1;
    return count;
  });
</script>

<section>
  <h2>Heroes</h2>
  {#each realmHeroes.slice(0, visibleCount) as hero (hero.id)}
    {@const owned = ownedCount(hero.id)}
    {@const cost = heroCost(hero, owned)}
    {@const production = (hero.production.gold ?? 0) * Math.max(owned, 1) * heroMultiplier(hero.id, game.state.upgrades) * fameBonus(game.state.balances['fame'] ?? 0)}
    <div class="row">
      <Icon icon={hero.icon} size={32} />
      <div class="info">
        <strong>{hero.name} <span class="count">×{owned}</span></strong>
        <span class="dim">{owned > 0 ? `+${formatNumber(production)} gold/s` : `produces ${formatNumber(hero.production.gold ?? 0)} gold/s`}</span>
      </div>
      <button disabled={!canAfford(game.state.balances, cost)} onclick={() => game.buyHero(hero.id)}>
        Recruit<br /><small>🪙 {formatNumber(cost.gold ?? 0)}</small>
      </button>
    </div>
  {/each}
  {#if visibleCount < realmHeroes.length}
    <div class="row locked">
      <Icon icon="🔒" size={32} />
      <div class="info"><strong>???</strong><span class="dim">Recruit a {realmHeroes[visibleCount - 1].name} to reveal</span></div>
    </div>
  {/if}
</section>

<style>
  section { display: grid; gap: 10px; padding: 24px; max-width: 560px; }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--panel);
    border-radius: var(--radius);
    padding: 12px 16px;
  }
  .row.locked { opacity: 0.5; border: 1px dashed var(--border); background: transparent; }
  .info { display: grid; flex: 1; }
  .count { color: var(--text-dim); font-weight: 400; }
  .dim { color: var(--text-dim); font-size: 0.85rem; }
  button { padding: 8px 16px; background: var(--accent); color: white; }
</style>
