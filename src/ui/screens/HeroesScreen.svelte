<script lang="ts">
  import { HEROES } from '../../content/heroes';
  import { bulkHeroCost, fameBonus, heroCost, heroMultiplier, maxAffordableHeroes } from '../../engine/formulas';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const AMOUNTS = [1, 5, 10, 15, 20, 'max'] as const;
  type BuyAmount = (typeof AMOUNTS)[number];
  const BUY_AMOUNT_KEY = 'ag.buyAmount';

  // de gekozen bulk-stand overleeft tabwissels én sessies
  function savedBuyAmount(): BuyAmount {
    try {
      const raw = localStorage.getItem(BUY_AMOUNT_KEY);
      const parsed = raw === 'max' ? 'max' : Number(raw);
      return (AMOUNTS as readonly (string | number)[]).includes(parsed) ? (parsed as BuyAmount) : 1;
    } catch {
      return 1;
    }
  }

  let buyAmount = $state<BuyAmount>(savedBuyAmount());

  function setBuyAmount(amount: BuyAmount): void {
    buyAmount = amount;
    try {
      localStorage.setItem(BUY_AMOUNT_KEY, String(amount));
    } catch {
      // best-effort
    }
  }

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
  <div class="header">
    <h2>Heroes</h2>
    <div class="amounts">
      {#each AMOUNTS as amount (amount)}
        <button class="amount" class:active={buyAmount === amount} onclick={() => setBuyAmount(amount)}>
          {amount === 'max' ? 'Max' : `${amount}×`}
        </button>
      {/each}
    </div>
  </div>
  {#each realmHeroes.slice(0, visibleCount) as hero (hero.id)}
    {@const owned = ownedCount(hero.id)}
    {@const buyCount = buyAmount === 'max'
      ? Math.max(maxAffordableHeroes(hero, owned, game.state.balances), 1)
      : buyAmount}
    {@const cost = buyCount === 1 ? heroCost(hero, owned) : bulkHeroCost(hero, owned, buyCount)}
    {@const perHero = (hero.production.gold ?? 0) * heroMultiplier(hero.id, game.state.upgrades) * fameBonus(game.state.balances['fame'] ?? 0)}
    {@const production = perHero * Math.max(owned, 1)}
    <div class="row">
      <Icon icon={hero.icon} size={32} />
      <div class="info">
        <strong>{hero.name} <span class="count">×{owned}</span></strong>
        <span class="dim">{owned > 0 ? `+${formatNumber(production)} gold/s` : `produces ${formatNumber(hero.production.gold ?? 0)} gold/s`}</span>
      </div>
      <button disabled={!canAfford(game.state.balances, cost)} onclick={() => game.buyHero(hero.id, buyCount)}>
        Recruit{#if buyCount > 1}&nbsp;×{buyCount}{/if}<br />
        <small>🪙 {formatNumber(cost.gold ?? 0)}</small><br />
        <small class="gain">+{formatNumber(perHero * buyCount)}/s</small>
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
  .header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .amounts { display: flex; gap: 4px; }
  .amount {
    padding: 5px 10px;
    font-size: 0.8rem;
    color: var(--text-dim);
    background: var(--panel);
    border-radius: 999px;
  }
  .amount.active { background: var(--accent); color: white; }
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
  button { padding: 8px 16px; background: var(--accent); color: white; display: block; text-align: center; }
  .gain { color: #bbf7d0; }
</style>
