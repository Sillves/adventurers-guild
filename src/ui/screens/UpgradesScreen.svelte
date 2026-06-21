<script lang="ts">
  import { HEROES } from '../../content/heroes';
  import type { UpgradeDef } from '../../content/types';
  import { UPGRADES } from '../../content/upgrades';
  import { clickGain, critParams, incomePerSecond, isHeroRevealed, isUpgradeUnlocked } from '../../engine/formulas';
  import { canAfford } from '../../engine/maps';
  import type { GameState } from '../../engine/state';
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

  /** Held-keten van een nog niet onthulde held: kaart verklapt anders de naam. */
  function hiddenHeroChain(head: UpgradeDef): boolean {
    if (!('multiplier' in head.effect) || !head.effect.target.startsWith('hero:')) return false;
    return !isHeroRevealed(head.effect.target.slice('hero:'.length), game.state);
  }

  // vaste volgorde op de prijs van de eerste tier: kaarten verspringen nooit,
  // ook niet na een aankoop of op max level
  const sorted = $derived(
    chains.filter((tiers) => !hiddenHeroChain(tiers[0]))
      .sort((a, b) => (a[0].cost.gold ?? 0) - (b[0].cost.gold ?? 0)),
  );

  /** Gemiddelde quest-opbrengst inclusief crit-verwachtingswaarde. */
  function expectedQuest(state: GameState): number {
    const { chance, multiplier } = critParams(state.upgrades);
    return (clickGain(state)['gold'] ?? 0) * (1 + chance * (multiplier - 1));
  }

  /** Wat levert deze upgrade nu concreet op? Berekend met de echte engine. */
  function gainText(upgrade: UpgradeDef): string {
    // combo schaalt met je klikgedrag, niet met de state — toon het plafond
    if (upgrade.effect.target === 'click-combo') {
      return `click fast: up to ×${upgrade.effect.maxMultiplier} per quest`;
    }
    const after: GameState = { ...game.state, upgrades: [...game.state.upgrades, upgrade.id] };
    // inkomsten/s inclusief auto-quests, zodat ook een Quest Herald "+X gold/s" toont
    const perSecond =
      (incomePerSecond(after)['gold'] ?? 0) - (incomePerSecond(game.state)['gold'] ?? 0);
    if (perSecond > 0) return `+${formatNumber(perSecond)} gold/s`;
    const perQuest = expectedQuest(after) - expectedQuest(game.state);
    if (perQuest > 0) return `+${formatNumber(perQuest)} gold per quest`;
    // held-upgrade zonder die held: vertel wat hij zou doen i.p.v. "no effect yet"
    if ('multiplier' in upgrade.effect && upgrade.effect.target.startsWith('hero:')) {
      const heroId = upgrade.effect.target.slice('hero:'.length);
      const hero = HEROES.find((h) => h.id === heroId);
      return `×${upgrade.effect.multiplier} ${hero?.name ?? heroId}s — recruit one first`;
    }
    return 'no effect yet';
  }
</script>

<section>
  <h2>Upgrades</h2>
  <div class="grid">
    {#each sorted as tiers (tiers[0].id)}
      {@const level = levelOf(tiers)}
      {@const maxed = level >= tiers.length}
      {@const shown = maxed ? tiers[tiers.length - 1] : tiers[level]}
      {@const locked = !maxed && !isUpgradeUnlocked(shown, game.state)}
      {@const affordable = !maxed && !locked && canAfford(game.state.balances, shown.cost)}
      <button
        class="tile"
        class:purchased={maxed}
        class:unaffordable={!maxed && !affordable}
        disabled={!affordable}
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
        {#if maxed}
          <span class="cost">✓ Max level</span>
        {:else}
          <span class="gain">{gainText(shown)}</span>
          <span class="cost" class:too-expensive={!affordable}><Icon icon="sprites/coin.png" size={12} /> {formatNumber(shown.cost.gold ?? 0)}</span>
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
  /* een onbetaalbare kaart blijft leesbaar: alleen de prijs vertelt het verhaal;
     de globale disabled-opacity (0.4) maakte de hele kaart onleesbaar */
  .tile:disabled { opacity: 1; }
  .tile.unaffordable { opacity: 0.9; }
  .tile.unaffordable :global(.pixel), .tile.unaffordable .head { filter: grayscale(0.4); }
  .cost.too-expensive { color: var(--danger); }
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
  .gain { color: var(--success); font-size: 0.8rem; }
  .cost { color: var(--gold); font-size: 0.85rem; }
</style>
