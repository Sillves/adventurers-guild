<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { REALMS } from '../content/realms';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';
  import HeroesScreen from './screens/HeroesScreen.svelte';
  import LeaderboardScreen from './screens/LeaderboardScreen.svelte';
  import PrestigeScreen from './screens/PrestigeScreen.svelte';
  import UpgradesScreen from './screens/UpgradesScreen.svelte';
  import WelcomeBack from './WelcomeBack.svelte';
  import { leaderboard } from './leaderboard.svelte';

  let screen = $state<Screen>('guild');
  let realmId = $state(REALMS[0].id);

  // Onthoud de scrollpositie per tab, zodat je bv. in Upgrades niet telkens
  // opnieuw naar beneden moet scrollen. Desktop scrolt in <main>, mobiel in
  // het venster — we lezen en herstellen allebei; de niet-scrollende klemt op 0.
  const scrollPositions: Partial<Record<Screen, number>> = {};
  let main = $state<HTMLElement | null>(null);

  function switchScreen(next: Screen): void {
    if (next === screen) return;
    scrollPositions[screen] = (main?.scrollTop ?? 0) || window.scrollY;
    screen = next;
    void tick().then(() => {
      const y = scrollPositions[next] ?? 0;
      if (main !== null) main.scrollTop = y;
      window.scrollTo(0, y);
    });
  }

  onMount(() => {
    game.init();
    // gethrottlede leaderboard-submissions; de module bewaakt interval en opt-in
    const timer = setInterval(() => leaderboard.maybeSubmit(game.state), 60_000);
    return () => clearInterval(timer);
  });
</script>

<div class="app">
  <Sidebar {screen} onswitch={switchScreen} {realmId} />
  <main bind:this={main}>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else if screen === 'heroes'}
      <HeroesScreen {realmId} />
    {:else if screen === 'upgrades'}
      <UpgradesScreen {realmId} />
    {:else if screen === 'prestige'}
      <PrestigeScreen />
    {:else}
      <LeaderboardScreen />
    {/if}
  </main>
  {#if game.offlineReport !== null}
    <WelcomeBack report={game.offlineReport} onclose={() => game.dismissOffline()} />
  {/if}
</div>

<style>
  /* Desktop: de app is exact het venster en alleen <main> scrolt. De navbar
     staat buiten de scrollcontainer en kan dus nooit meebewegen — ook niet
     bij de elastische bounce aan het einde van de scroll (macOS). */
  .app { display: flex; height: 100vh; }
  main { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  @media (max-width: 700px) {
    /* Mobiel scrolt het venster zelf; de navbar is daar fixed onderaan. */
    .app { flex-direction: column; height: auto; min-height: 100vh; }
    main {
      overflow-y: visible;
      overscroll-behavior: auto;
      padding-top: 48px;
      padding-bottom: calc(72px + env(safe-area-inset-bottom));
    }
  }
</style>
