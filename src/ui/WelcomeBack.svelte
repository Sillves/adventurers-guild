<script lang="ts">
  import { onMount } from 'svelte';
  import type { OfflineReport } from '../engine/advance';
  import { CURRENCIES } from '../content/currencies';
  import { formatDuration, formatNumber } from './format';
  import Icon from './Icon.svelte';

  let { report, onclose }: { report: OfflineReport; onclose: () => void } = $props();
  let dialog: HTMLDivElement;

  onMount(() => dialog?.focus());
</script>

<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
  <div class="modal" role="dialog" aria-label="Welcome back" aria-modal="true" tabindex="-1" bind:this={dialog} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
    <h2>Welcome back!</h2>
    <p class="dim">Your guild kept working for {formatDuration(report.seconds)}:</p>
    {#each CURRENCIES as currency (currency.id)}
      {#if (report.earned[currency.id] ?? 0) > 0}
        <div class="earned">
          <Icon icon={currency.icon} size={20} />
          +{formatNumber(report.earned[currency.id] ?? 0)} {currency.name}
        </div>
      {/if}
    {/each}
    <button onclick={onclose}>Collect</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgb(0 0 0 / 0.6);
    display: grid; place-items: center;
  }
  .modal {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 28px;
    display: grid; gap: 12px;
    min-width: 280px;
    text-align: center;
  }
  .dim { color: var(--text-dim); }
  .earned { font-size: 1.2rem; color: var(--gold); display: flex; justify-content: center; gap: 8px; }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
