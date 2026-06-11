<script lang="ts">
  import { onMount } from 'svelte';
  import { REALMS } from '../content/realms';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';
  import HeroesScreen from './screens/HeroesScreen.svelte';
  import PrestigeScreen from './screens/PrestigeScreen.svelte';
  import UpgradesScreen from './screens/UpgradesScreen.svelte';
  import WelcomeBack from './WelcomeBack.svelte';

  let screen = $state<Screen>('guild');
  let realmId = $state(REALMS[0].id);

  onMount(() => game.init());
</script>

<div class="app">
  <Sidebar bind:screen {realmId} />
  <main>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else if screen === 'heroes'}
      <HeroesScreen {realmId} />
    {:else if screen === 'upgrades'}
      <UpgradesScreen {realmId} />
    {:else}
      <PrestigeScreen />
    {/if}
  </main>
  {#if game.offlineReport !== null}
    <WelcomeBack report={game.offlineReport} onclose={() => game.dismissOffline()} />
  {/if}
</div>

<style>
  .app { display: flex; min-height: 100vh; }
  main { flex: 1; }
  @media (max-width: 700px) {
    .app { flex-direction: column; }
    main {
      padding-top: 48px;
      padding-bottom: calc(72px + env(safe-area-inset-bottom));
    }
  }
</style>
