<script lang="ts">
  import { onMount } from 'svelte';
  import { NUMBER_SCALE } from './format';

  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDivElement;

  onMount(() => dialog?.focus());
</script>

<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
  <div class="modal" role="dialog" aria-label="Number names" aria-modal="true" tabindex="-1" bind:this={dialog} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
    <h2>🪙 How big is that number?</h2>
    <p class="dim">Every step is ×1,000 the one before it.</p>
    <table>
      <tbody>
        {#each NUMBER_SCALE as entry, i (entry.suffix)}
          <tr>
            <td class="suffix">{entry.suffix}</td>
            <td class="name">{entry.name}</td>
            <td class="dim worth">{i === 0 ? '1,000' : `1,000 ${NUMBER_SCALE[i - 1].suffix}`}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button onclick={onclose}>Got it</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgb(0 0 0 / 0.6);
    display: grid; place-items: center;
    z-index: 20;
  }
  .modal {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 24px;
    display: grid; gap: 12px;
    min-width: 280px;
    max-height: 85vh;
    overflow-y: auto;
  }
  h2 { font-size: 1.1rem; text-align: center; }
  .dim { color: var(--text-dim); font-size: 0.85rem; text-align: center; }
  table { border-collapse: collapse; }
  td { padding: 4px 12px; font-variant-numeric: tabular-nums; }
  tr:nth-child(odd) { background: var(--panel-raised); }
  .suffix { color: var(--gold); font-weight: 600; text-align: right; }
  .worth { text-align: right; }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
