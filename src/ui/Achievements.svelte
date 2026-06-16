<script lang="ts">
  import { onMount } from "svelte";
  import { ACHIEVEMENTS } from "../content/achievements";
  import { game } from "./game.svelte";

  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDivElement;

  onMount(() => dialog?.focus());

  const unlocked = $derived(new Set(game.state.achievements));
  const earnedCount = $derived(ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length);
</script>

<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === "Escape") onclose(); }}>
  <div class="modal" role="dialog" aria-modal="true" tabindex="-1" bind:this={dialog} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
    <h2>🏅 Achievements</h2>
    <p class="dim">{earnedCount} / {ACHIEVEMENTS.length} unlocked — they survive every refound.</p>

    <!-- HIER komt jouw lijst -->
     <ul>
        {#each ACHIEVEMENTS as ACHIEVEMENT (ACHIEVEMENT.id)}
            {@const earned  = unlocked.has(ACHIEVEMENT.id)}    
            <li class:earned={earned}>
                <span class="icon">{earned ? ACHIEVEMENT.icon : "🔒"}</span>
                <span class="info">
                    <strong>{ACHIEVEMENT.name}</strong>
                    <span class="desc">{ACHIEVEMENT.description}</span>
                </span>
                {#if earned}<span class="check">✓</span>{/if}
            </li>
        {/each}
     </ul>
    <button onclick={onclose}>Back to work</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.6); display: grid; place-items: center; z-index: 20; }
  .modal { background: var(--panel); border-radius: var(--radius); padding: 24px; display: grid; gap: 12px; min-width: 320px; max-width: 460px; max-height: 85vh; overflow-y: auto; }
  h2 { font-size: 1.1rem; text-align: center; }
  .dim { color: var(--text-dim); font-size: 0.85rem; }
  ul { display: grid; gap: 6px; list-style: none; margin: 0; padding: 0; }
  li {
    display: flex;
    align-items: center;
    gap: 12px;
    /* behaald = gevulde kaart */
    background: var(--panel-raised);
    border: 1px solid transparent;
    border-radius: var(--radius);
    padding: 10px 14px;
  }
  /* nog niet behaald: een omlijnde "teaser" met gedimde titel — geen opacity-truc */
  li:not(.earned) { background: transparent; border-color: var(--border); }
  li:not(.earned) strong { color: var(--text-dim); font-weight: 600; }
  .icon { font-size: 24px; width: 28px; text-align: center; flex: none; }
  .info { display: grid; flex: 1; gap: 2px; }
  .info strong { font-weight: 700; }
  .desc { color: var(--text-dim); font-size: 0.78rem; }
  .check { color: var(--gold); font-weight: 700; font-size: 1.1rem; }
</style>