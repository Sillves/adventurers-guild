<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './game.svelte';
  import Sidebar, { type Screen } from './Sidebar.svelte';
  import GuildScreen from './screens/GuildScreen.svelte';

  let screen = $state<Screen>('guild');

  onMount(() => game.init());
</script>

<div class="app">
  <Sidebar bind:screen />
  <main>
    {#if screen === 'guild'}
      <GuildScreen />
    {:else}
      <p style="padding: 24px;">Coming soon…</p>
    {/if}
  </main>
</div>

<style>
  .app { display: flex; min-height: 100vh; }
  main { flex: 1; }
</style>
