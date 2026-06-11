<script module lang="ts">
  export type Screen = 'guild' | 'heroes' | 'upgrades' | 'prestige' | 'leaderboard';
</script>

<script lang="ts">
  import { CURRENCIES } from '../content/currencies';
  import { HEROES } from '../content/heroes';
  import { UPGRADES } from '../content/upgrades';
  import { heroCost, incomePerSecond, isUpgradeUnlocked } from '../engine/formulas';
  import { addMaps, canAfford } from '../engine/maps';
  import { formatNumber } from './format';
  import { game } from './game.svelte';
  import Icon from './Icon.svelte';
  import { isMuted, toggleMuted } from './sound';
  import { isKeepAwake, toggleKeepAwake, wakeLockSupported } from './wakelock';

  let { screen, onswitch, realmId }: { screen: Screen; onswitch: (next: Screen) => void; realmId: string } = $props();

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
    { id: 'leaderboard', label: 'Ranking', icon: '🥇' },
  ];

  // de teller toont wat er werkelijk per seconde binnenkomt: heldenproductie,
  // auto-quests én je gemeten klikinkomsten van de afgelopen seconden
  const production = $derived.by(() => {
    const income = incomePerSecond(game.state);
    const clicks = game.clickIncomeRate;
    return clicks > 0 ? addMaps(income, { gold: clicks }) : income;
  });
  let muted = $state(isMuted());
  let keepAwake = $state(isKeepAwake());
  let showSettings = $state(false);

  // Alleen zichtbare heroes tellen mee: na de eerste niet-gekochte hero stopt de reveal.
  const heroAffordable = $derived.by(() => {
    for (const hero of HEROES.filter((h) => h.realmId === realmId)) {
      const owned = game.state.heroes[hero.id] ?? 0;
      if (canAfford(game.state.balances, heroCost(hero, owned))) return true;
      if (owned === 0) break;
    }
    return false;
  });

  const upgradeAffordable = $derived(
    UPGRADES.some(
      (u) =>
        u.realmId === realmId &&
        !game.state.upgrades.includes(u.id) &&
        isUpgradeUnlocked(u, game.state.upgrades) &&
        canAfford(game.state.balances, u.cost),
    ),
  );

  const badges = $derived<Partial<Record<Screen, boolean>>>({
    heroes: heroAffordable,
    upgrades: upgradeAffordable,
  });
</script>

<nav>
  {#each items as item (item.id)}
    <button class="tab" class:active={screen === item.id} onclick={() => onswitch(item.id)}>
      <Icon icon={item.icon} size={18} /> <span>{item.label}</span>
      {#if badges[item.id] === true && screen !== item.id}
        <span class="dot"></span>
      {/if}
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
  {#if wakeLockSupported}
    <div class="awake switch-row">
      <span>Keep screen on</span>
      <button
        class="switch"
        class:on={keepAwake}
        role="switch"
        aria-checked={keepAwake}
        aria-label="Keep screen on"
        onclick={() => (keepAwake = toggleKeepAwake())}
      ><span class="knob"></span></button>
    </div>
  {/if}
  <button class="settings-toggle" onclick={() => (showSettings = !showSettings)}>⚙️</button>
  {#if showSettings}
    <div class="settings-panel">
      {#if wakeLockSupported}
        <div class="switch-row">
          <span>Keep screen on</span>
          <button
            class="switch"
            class:on={keepAwake}
            role="switch"
            aria-checked={keepAwake}
            aria-label="Keep screen on"
            onclick={() => (keepAwake = toggleKeepAwake())}
          ><span class="knob"></span></button>
        </div>
      {/if}
      <button onclick={() => { showSettings = false; void exportSave(); }}>Export save</button>
      <button onclick={() => { showSettings = false; importSave(); }}>Import save</button>
      <a class="credits" href="https://github.com/game-icons/icons" target="_blank" rel="noreferrer">Credits & licenses</a>
    </div>
  {/if}
  <a class="credits desktop-credits" href="https://github.com/game-icons/icons" target="_blank" rel="noreferrer">Credits & licenses</a>
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
    /* de app-shell is 100vh en alleen <main> scrolt; de navbar vult de kolom
       en scrolt hooguit intern als hij zelf niet past */
    height: 100vh;
    overflow-y: auto;
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
  .tab { position: relative; }
  .dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gold);
  }
  .settings-toggle,
  .settings-panel { display: none; }
  .balances { margin-top: auto; padding: 12px 4px; display: grid; gap: 6px; }
  .balance { display: flex; align-items: center; gap: 6px; color: var(--gold); }
  /* cijfers met vaste breedte, anders verspringt de balk bij elke tick */
  .balance strong, .rate { font-variant-numeric: tabular-nums; }
  .rate { color: var(--text-dim); font-size: 0.8rem; }
  .mute { font-size: 0.85rem; color: var(--text-dim); }
  /* zelfde padding als de knoppen, zodat label en knopteksten uitlijnen */
  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    font-size: 0.85rem;
    color: var(--text-dim);
  }
  .switch {
    position: relative;
    flex: none;
    width: 38px;
    height: 22px;
    padding: 0;
    border-radius: 999px;
    background: var(--panel-raised);
    transition: background 0.15s;
  }
  .switch.on { background: var(--accent); }
  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: translate 0.15s;
  }
  .switch.on .knob { translate: 16px 0; }
  .credits { color: var(--text-dim); font-size: 0.75rem; padding: 4px 12px; text-decoration: none; display: block; text-align: center; }
  .save-actions { display: flex; gap: 6px; }
  .save-actions button { flex: 1; font-size: 0.75rem; color: var(--text-dim); padding: 6px; background: var(--panel-raised); }
  @media (max-width: 700px) {
    nav {
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      height: auto;
      overflow-y: visible;
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
      height: 44px;
      padding: 0 92px 0 14px;
      display: flex;
      align-items: center;
      gap: 18px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      z-index: 10;
    }
    /* fame rechts verankeren zodat die niet meeschuift als het goudgetal breder wordt;
       enkel de tweede balance krijgt auto-marge zodat latere valuta rechts gegroepeerd blijven */
    .balance:first-child + .balance { margin-left: auto; }
    /* knoppen overspannen de volledige balkhoogte en centreren hun icoon,
       in plaats van op een hardgecodeerde top-offset te hangen */
    .mute,
    .settings-toggle {
      position: fixed;
      top: 0;
      height: 44px;
      display: flex;
      align-items: center;
      z-index: 11;
      padding: 0 10px;
      background: transparent;
      font-size: 1rem;
    }
    .mute { right: 44px; }
    .settings-toggle { right: 4px; }
    .mute-label { display: none; }
    .settings-panel {
      display: grid;
      gap: 8px;
      position: fixed;
      top: 48px;
      right: 8px;
      z-index: 12;
      background: var(--panel-raised);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px;
      /* één lettergrootte voor alle rijen in het paneel */
      font-size: 0.9rem;
    }
    .settings-panel .switch-row,
    .settings-panel .credits { font-size: inherit; }
    .settings-panel .credits { display: block; text-align: left; padding: 4px 12px; }
    .dot { top: 2px; right: calc(50% - 16px); }
    /* op mobiel zit de wakker-blijven-toggle in het instellingenpaneel */
    .awake,
    .desktop-credits,
    .save-actions { display: none; }
  }
</style>
