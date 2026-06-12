<script lang="ts">
  import { onMount } from 'svelte';
  import { formatEta, formatNumber } from './format';
  import { game } from './game.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let dialog: HTMLDivElement;

  onMount(() => dialog?.focus());

  const stats = $derived(game.state.stats);
  const critRate = $derived(stats.clicks > 0 ? ((stats.crits / stats.clicks) * 100).toFixed(1) : null);

  const rows = $derived.by(() => [
    { icon: '⚔️', label: 'Quests clicked', value: formatNumber(stats.clicks) },
    { icon: '✨', label: 'Critical quests', value: formatNumber(stats.crits) + (critRate !== null ? ` (${critRate}%)` : '') },
    { icon: '🪓', label: 'Raids fought off', value: formatNumber(stats.raidsWon) },
    { icon: '🔥', label: 'Times plundered', value: formatNumber(stats.raidsLost) },
    { icon: '💰', label: 'Mercenaries hired', value: formatNumber(stats.mercsPaid) },
    { icon: '👑', label: 'Guild refounds', value: formatNumber(game.state.prestiges) },
    { icon: '🪙', label: 'Lifetime gold', value: formatNumber(game.state.lifetimeEarned['gold'] ?? 0) },
    { icon: '🏆', label: 'Fame banked', value: formatNumber(game.state.balances['fame'] ?? 0) },
    { icon: '🕰️', label: 'Active playtime', value: stats.playSeconds < 1 ? '—' : formatEta(stats.playSeconds) },
  ]);
</script>

<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
  <div class="modal" role="dialog" aria-label="Guild statistics" aria-modal="true" tabindex="-1" bind:this={dialog} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
    <h2>📊 Guild statistics</h2>
    <p class="dim">Lifetime numbers — a refound wipes your gold, never your history.</p>
    <table>
      <tbody>
        {#each rows as row (row.label)}
          <tr>
            <td class="icon">{row.icon}</td>
            <td>{row.label}</td>
            <td class="value">{row.value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <button onclick={onclose}>Back to work</button>
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
    min-width: 300px;
    max-height: 85vh;
    overflow-y: auto;
  }
  h2 { font-size: 1.1rem; text-align: center; }
  .dim { color: var(--text-dim); font-size: 0.85rem; text-align: center; }
  table { border-collapse: collapse; }
  td { padding: 5px 10px; }
  tr:nth-child(odd) { background: var(--panel-raised); }
  .icon { text-align: center; }
  .value { color: var(--gold); font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
