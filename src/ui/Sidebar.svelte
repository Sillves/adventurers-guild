<script module lang="ts">
  export type Screen = 'guild' | 'heroes' | 'upgrades' | 'prestige';
</script>

<script lang="ts">
  import { CURRENCIES } from '../content/currencies';
  import { productionPerSecond } from '../engine/formulas';
  import { formatNumber } from './format';
  import { game } from './game.svelte';
  import Icon from './Icon.svelte';
  import { isMuted, toggleMuted } from './sound';

  let { screen = $bindable() }: { screen: Screen } = $props();

  const items: ReadonlyArray<{ id: Screen; label: string; icon: string }> = [
    { id: 'guild', label: 'Guild', icon: '🏰' },
    { id: 'heroes', label: 'Heroes', icon: '🧙' },
    { id: 'upgrades', label: 'Upgrades', icon: '⬆️' },
    { id: 'prestige', label: 'Prestige', icon: '👑' },
  ];

  const production = $derived(productionPerSecond(game.state));
  let muted = $state(isMuted());
</script>

<nav>
  {#each items as item (item.id)}
    <button class:active={screen === item.id} onclick={() => (screen = item.id)}>
      <Icon icon={item.icon} size={18} /> {item.label}
    </button>
  {/each}
  <div class="balances">
    {#each CURRENCIES as currency (currency.id)}
      {#if (game.state.balances[currency.id] ?? 0) > 0 || currency.id === 'gold'}
        <div class="balance">
          <Icon icon={currency.icon} size={16} />
          <strong>{formatNumber(game.state.balances[currency.id] ?? 0)}</strong>
          {#if (production[currency.id] ?? 0) > 0}
            <span class="rate">+{formatNumber(production[currency.id] ?? 0)}/s</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  <button class="mute" onclick={() => (muted = toggleMuted())}>
    {muted ? '🔇 Sound off' : '🔊 Sound on'}
  </button>
</nav>

<style>
  nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: var(--panel);
    min-width: 180px;
  }
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    text-align: left;
    background: transparent;
    color: var(--text-dim);
  }
  button.active { background: var(--accent); color: white; }
  .balances { margin-top: auto; padding: 12px 4px; display: grid; gap: 6px; }
  .balance { display: flex; align-items: center; gap: 6px; color: var(--gold); }
  .rate { color: var(--text-dim); font-size: 0.8rem; }
  .mute { font-size: 0.85rem; color: var(--text-dim); }
</style>
