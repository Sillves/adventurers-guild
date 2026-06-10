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

  async function exportSave(): Promise<void> {
    const data = game.exportSave();
    try {
      await navigator.clipboard.writeText(data);
      alert('Save copied to clipboard!');
    } catch {
      window.prompt('Copy your save:', data);
    }
  }

  function importSave(): void {
    const data = window.prompt('Paste your save:');
    if (data === null) return;
    if (!game.importSave(data)) alert('That save could not be read.');
  }

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
    <button class="tab" class:active={screen === item.id} onclick={() => (screen = item.id)}>
      <Icon icon={item.icon} size={18} /> <span>{item.label}</span>
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
    {muted ? '🔇' : '🔊'}<span class="mute-label"> {muted ? 'Sound off' : 'Sound on'}</span>
  </button>
  <a class="credits" href="https://github.com/game-icons/icons" target="_blank" rel="noreferrer">Credits & licenses</a>
  <div class="save-actions">
    <button onclick={exportSave}>Export save</button>
    <button onclick={importSave}>Import save</button>
  </div>
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
  .credits { color: var(--text-dim); font-size: 0.75rem; padding: 4px 12px; text-decoration: none; display: block; text-align: center; }
  .save-actions { display: flex; gap: 6px; }
  .save-actions button { flex: 1; font-size: 0.75rem; color: var(--text-dim); padding: 6px; background: var(--panel-raised); }
  @media (max-width: 700px) {
    nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      flex-direction: row;
      gap: 4px;
      min-width: 0;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      z-index: 10;
    }
    .tab {
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      padding: 6px 0;
      font-size: 0.7rem;
      text-align: center;
    }
    .balances {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      margin: 0;
      padding: 10px 14px;
      padding-right: 52px;
      display: flex;
      gap: 18px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      z-index: 10;
    }
    .mute {
      position: fixed;
      top: 3px;
      right: 4px;
      z-index: 11;
      padding: 8px 10px;
      background: transparent;
      font-size: 1rem;
    }
    .mute-label { display: none; }
    .credits,
    .save-actions { display: none; }
  }
</style>
