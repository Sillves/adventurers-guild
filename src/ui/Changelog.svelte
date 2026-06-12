<script lang="ts">
  import { onMount } from 'svelte';
  import { CHANGELOG } from '../content/changelog';

  let { unseen, onclose }: { unseen: number; onclose: () => void } = $props();
  let dialog: HTMLDivElement;

  onMount(() => dialog?.focus());

  // datums alleen tonen wanneer ze wisselen, dan leest de lijst als een tijdlijn
  function showDate(i: number): boolean {
    return i === 0 || CHANGELOG[i].date !== CHANGELOG[i - 1].date;
  }

  function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
</script>

<div class="backdrop" role="presentation" onclick={onclose} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
  <div class="modal" role="dialog" aria-label="What's new" aria-modal="true" tabindex="-1" bind:this={dialog} onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
    <h2>📜 What's new in the guild</h2>
    {#each CHANGELOG as entry, i (entry.date + entry.title)}
      {#if showDate(i)}
        <div class="date">{formatDate(entry.date)}</div>
      {/if}
      <div class="entry">
        <span class="icon">{entry.icon}</span>
        <div class="body">
          <strong>
            {entry.title}
            {#if i < unseen}<span class="new">NEW</span>{/if}
          </strong>
          <p>{entry.description}</p>
          <span class="prs">
            {#each entry.prs as pr (pr)}
              <a href="https://github.com/Sillves/adventurers-guild/pull/{pr}" target="_blank" rel="noreferrer">#{pr}</a>
            {/each}
          </span>
        </div>
      </div>
    {/each}
    <button onclick={onclose}>Back to the guild</button>
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
    width: min(440px, calc(100vw - 32px));
    max-height: 85vh;
    overflow-y: auto;
  }
  h2 { font-size: 1.1rem; text-align: center; }
  .date {
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 6px;
  }
  .entry {
    display: flex;
    gap: 12px;
    background: var(--panel-raised);
    border-radius: var(--radius);
    padding: 10px 14px;
    text-align: left;
  }
  .icon { font-size: 1.3rem; line-height: 1.4; }
  .body { display: grid; gap: 4px; }
  .body p { color: var(--text-dim); font-size: 0.85rem; margin: 0; }
  .new {
    background: var(--gold);
    color: #1c1408;
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 1px 7px;
    margin-left: 6px;
    vertical-align: 2px;
  }
  .prs { display: flex; gap: 8px; }
  .prs a { color: var(--text-dim); font-size: 0.7rem; text-decoration: none; }
  .prs a:hover { text-decoration: underline; }
  button { background: var(--accent); color: white; padding: 10px; }
</style>
