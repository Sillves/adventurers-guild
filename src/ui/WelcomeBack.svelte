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
    {#if report.heroGold > 0 && report.staffGold > 0}
      <div class="breakdown">
        <span>🧙 Heroes +{formatNumber(report.heroGold)}</span>
        <span><Icon icon="sprites/horn.png" size={14} /> Staff +{formatNumber(report.staffGold)}</span>
      </div>
    {/if}
    {#if report.fameReady > 0}
      <div class="fame-ready">
        <Icon icon="sprites/fame.png" size={16} /> +{formatNumber(report.fameReady)} Fame ready to claim
      </div>
    {/if}
    {#if report.plundered}
      <div class="plundered">
        🪓 Barbarians broke through while you were away — they took 20% of your gold and are still plundering. Fight them off!
      </div>
    {/if}
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
  .breakdown { display: flex; justify-content: center; gap: 16px; color: var(--text-dim); font-size: 0.85rem; }
  .fame-ready {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    color: var(--gold); font-weight: 600; font-size: 0.95rem;
  }
  .plundered {
    max-width: 280px;
    background: var(--panel-raised);
    border: 1px solid var(--danger);
    color: var(--danger);
    border-radius: var(--radius);
    padding: 8px 12px;
    font-size: 0.85rem;
  }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
