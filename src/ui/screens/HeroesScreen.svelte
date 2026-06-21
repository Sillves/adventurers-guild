<script lang="ts">
  import { HEROES } from '../../content/heroes';
  // de knop-gain is het échte inkomensverschil (incl. synergy → auto-quests):
  // pure productie loog tot ~10× te laag bij volle synergy/crit/marshal-stacks
  import { bulkHeroCost, heroCost, heroGoldPerSecond, incomePerSecond, maxAffordableHeroes, milestoneMultiplier, nextMilestone, productionPerSecond } from '../../engine/formulas';
  import { heroCostMultiplier } from '../../engine/perks';
  import { canAfford } from '../../engine/maps';
  import { formatNumber } from '../format';
  import { game } from '../game.svelte';
  import Icon from '../Icon.svelte';

  let { realmId }: { realmId: string } = $props();

  const AMOUNTS = [1, 5, 10, 15, 20, 'boost', 'max'] as const;
  type BuyAmount = (typeof AMOUNTS)[number];
  const BUY_AMOUNT_KEY = 'ag.buyAmount';

  // de gekozen bulk-stand overleeft tabwissels én sessies
  function savedBuyAmount(): BuyAmount {
    try {
      const raw = localStorage.getItem(BUY_AMOUNT_KEY);
      // 'max' en 'boost' zijn strings; al de rest moet een getal uit AMOUNTS zijn
      const parsed = raw === 'max' || raw === 'boost' ? raw : Number(raw);
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

  // totale heldenproductie/s, voor het aandeel-percentage per held
  const totalProd = $derived(productionPerSecond(game.state)['gold'] ?? 0);
  // Fame-perk-korting op de heldenkost: overal dezelfde, zodat de getoonde prijs
  // klopt met wat de engine afschrijft
  const heroDiscount = $derived(heroCostMultiplier(game.state.perks));
</script>

<section>
  <div class="header">
    <h2>Heroes</h2>
    <div class="amounts">
      {#each AMOUNTS as amount (amount)}
        <button class="amount" class:active={buyAmount === amount} title={amount === 'boost' ? 'Buy up to the next ⭐ boost' : amount === 'max' ? 'Buy as many as you can afford' : undefined} onclick={() => setBuyAmount(amount)}>
          {amount === 'max' ? 'Max' : amount === 'boost' ? '⭐' : `${amount}×`}
        </button>
      {/each}
    </div>
  </div>
  {#each realmHeroes.slice(0, visibleCount) as hero (hero.id)}
    {@const owned = ownedCount(hero.id)}
    {@const buyCount = buyAmount === 'max'
      ? Math.max(maxAffordableHeroes(hero, owned, game.state.balances, heroDiscount), 1)
      : buyAmount === 'boost'
        ? nextMilestone(owned) - owned
        : buyAmount}
    {@const cost = buyCount === 1 ? heroCost(hero, owned, heroDiscount) : bulkHeroCost(hero, owned, buyCount, heroDiscount)}
    {@const production = heroGoldPerSecond(game.state, hero.id)}
    {@const sharePct = totalProd > 0 ? (production / totalProd) * 100 : 0}
    {@const after = { ...game.state, heroes: { ...game.state.heroes, [hero.id]: owned + buyCount } }}
    {@const buyGain = (incomePerSecond(after)['gold'] ?? 0) - (incomePerSecond(game.state)['gold'] ?? 0)}
    <div class="row">
      <Icon icon={hero.icon} size={32} />
      <div class="info">
        <strong>{hero.name} <span class="count">×{owned}</span></strong>
        <span class="dim">{owned > 0 ? `+${formatNumber(production)} gold/s · ${sharePct.toFixed(1)}% of income` : `produces ${formatNumber(hero.production.gold ?? 0)} gold/s`}</span>
        {#if owned >= 10}
          <span class="stars">⭐ ×{formatNumber(milestoneMultiplier(owned))} · next boost at {nextMilestone(owned)}</span>
        {:else if owned > 0}
          <span class="stars">⭐ ×1.25 boost at {nextMilestone(owned)}</span>
        {/if}
      </div>
      <button disabled={!canAfford(game.state.balances, cost)} onclick={() => game.buyHero(hero.id, buyCount)}>
        Recruit{#if buyCount > 1}&nbsp;×{buyCount}{/if}<br />
        <small><Icon icon="sprites/coin.png" size={12} /> {formatNumber(cost.gold ?? 0)}</small><br />
        <small class="gain">+{formatNumber(buyGain)}/s</small>
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
  .stars { color: var(--gold); font-size: 0.75rem; }
  button { padding: 8px 16px; background: var(--accent); color: white; display: block; text-align: center; }
  .gain { color: #bbf7d0; }
</style>
