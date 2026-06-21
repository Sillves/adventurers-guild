<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDuration, formatNumber } from '../format';
  import { game } from '../game.svelte';
  import { leaderboard } from '../leaderboard.svelte';
  import Icon from '../Icon.svelte';

  let nameInput = $state(leaderboard.name);

  onMount(() => void leaderboard.refresh());

  function join(): void {
    leaderboard.join(nameInput, game.state);
  }

  const age = $derived(
    leaderboard.fetchedAt > 0 ? Math.max(0, Math.round((Date.now() - leaderboard.fetchedAt) / 1000)) : 0,
  );
</script>

<section>
  <h2>🥇 Leaderboard</h2>

  {#if !leaderboard.optIn}
    <div class="panel join">
      <p>Share your progress and see how your guild stacks up. Opt-in only — we store just a name and your scores, nothing else.</p>
      <div class="join-row">
        <input
          type="text"
          maxlength="20"
          placeholder="Your name"
          bind:value={nameInput}
          onkeydown={(e) => { if (e.key === 'Enter') join(); }}
        />
        <button class="primary" disabled={nameInput.trim().length === 0} onclick={join}>Join</button>
      </div>
    </div>
  {/if}

  {#if leaderboard.state === 'error'}
    <p class="dim">The leaderboard is taking a nap. <button class="link" onclick={() => void leaderboard.refresh()}>Try again</button></p>
  {:else if leaderboard.state === 'loading' && leaderboard.board.length === 0}
    <p class="dim">Summoning the rankings…</p>
  {:else if leaderboard.board.length === 0}
    <p class="dim">Nobody here yet — be the first to join!</p>
  {:else}
    <div class="board">
      <div class="row head">
        <span class="rank">#</span>
        <span class="name">Guild</span>
        <span class="num"><Icon icon="sprites/fame.png" size={13} /><span class="th"> Fame</span></span>
        <span class="num"><Icon icon="sprites/coin.png" size={13} /><span class="th"> Lifetime</span></span>
        <span class="num" title="Refounds">👑<span class="th"> Refounds</span></span>
      </div>
      {#each leaderboard.board as entry (entry.rank)}
        <div class="row" class:me={entry.me}>
          <span class="rank">{entry.rank}</span>
          <span class="name">
            {entry.name}
            {#if entry.flagged}<span class="flag" title="Score outside what honest play allows">{entry.flagLabel}</span>{/if}
          </span>
          <span class="num">{formatNumber(entry.fame)}</span>
          <span class="num">{formatNumber(entry.lifetimeGold)}</span>
          <span class="num">{formatNumber(entry.prestiges)}</span>
        </div>
      {/each}
    </div>
    <div class="meta">
      <span class="dim">Updated {age < 5 ? 'just now' : `${formatDuration(age)} ago`}</span>
      <button class="link" onclick={() => void leaderboard.refresh()}>Refresh</button>
    </div>
  {/if}

  {#if leaderboard.optIn}
    <p class="dim small">
      Playing as <strong>{leaderboard.name}</strong> —
      <button class="link" onclick={() => { const n = window.prompt('New name:', leaderboard.name); if (n !== null) leaderboard.rename(n, game.state); }}>change name</button> ·
      <button class="link" onclick={() => leaderboard.leave()}>stop sharing</button>
    </p>
  {/if}
</section>

<style>
  section { display: grid; gap: 16px; padding: 24px; max-width: 560px; }
  .panel { background: var(--panel); border-radius: var(--radius); padding: 16px; display: grid; gap: 12px; }
  .join-row { display: flex; gap: 8px; }
  input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }
  .primary { background: var(--accent); color: white; padding: 10px 18px; }
  .board { display: grid; gap: 2px; }
  .row {
    display: grid;
    grid-template-columns: 2rem 1fr 5rem 5.5rem 5.5rem;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    background: var(--panel);
    font-variant-numeric: tabular-nums;
  }
  .row:first-child { border-radius: var(--radius) var(--radius) 0 0; }
  .row:last-child { border-radius: 0 0 var(--radius) var(--radius); }
  .row.head { color: var(--text-dim); font-size: 0.8rem; background: var(--panel-raised); }
  .row.me { outline: 2px solid var(--accent); outline-offset: -2px; }
  .rank { color: var(--text-dim); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .num { text-align: right; font-size: 0.9rem; }
  .flag { display: block; font-size: 0.7rem; color: var(--danger); }
  .meta { display: flex; justify-content: space-between; align-items: center; }
  .link {
    background: none;
    border: none;
    color: var(--accent);
    padding: 0;
    font-size: inherit;
    text-decoration: underline;
  }
  .dim { color: var(--text-dim); }
  .small { font-size: 0.85rem; }
  @media (max-width: 700px) {
    /* alle vijf kolommen blijven zichtbaar: koppen worden iconen, kolommen smaller */
    .row { grid-template-columns: 1.6rem 1fr 3.2rem 4.2rem 2.4rem; gap: 6px; padding: 8px 10px; }
    .th { display: none; }
    .num { font-size: 0.85rem; }
  }
</style>
