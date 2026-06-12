<script lang="ts">
  import { MERC_COST_SECONDS } from '../../engine/commands';
  import { autoClickPerSecond, clickGain, comboCap, fameGain, fameTargetGold, incomePerSecond } from '../../engine/formulas';
  import { formatEta, formatNumber } from '../format';
  import { game } from '../game.svelte';
  import GuildYard from '../GuildYard.svelte';

  const gain = $derived(clickGain(game.state).gold ?? 0);
  const maxCombo = $derived(comboCap(game.state.upgrades));
  const comboMult = $derived(game.comboMultiplier);
  const autoRate = $derived(autoClickPerSecond(game.state)['gold'] ?? 0);
  const runGold = $derived(game.state.runEarned['gold'] ?? 0);
  const lifetimeGold = $derived(game.state.lifetimeEarned['gold'] ?? 0);
  const fame = $derived(game.state.balances['fame'] ?? 0);
  const nextTarget = $derived(fameTargetGold(fame + 1));
  const prevTarget = $derived(fameTargetGold(fame));
  // ETA op het huidige tempo, inclusief je gemeten klikinkomsten: hard klikken
  // ziet het getal live dalen
  const fameEtaSeconds = $derived.by(() => {
    const rate = (incomePerSecond(game.state)['gold'] ?? 0) + game.clickIncomeRate;
    if (rate <= 0) return null;
    return Math.max(0, nextTarget - lifetimeGold) / rate;
  });
  const prestigeProgress = $derived(
    Math.min(Math.max((lifetimeGold - prevTarget) / (nextTarget - prevTarget), 0), 1),
  );

  const raid = $derived(game.state.raid);
  // game.state verandert elke frame (rAF-advance), dus deze countdown tikt live
  const raidSecondsLeft = $derived(
    raid?.phase === 'incoming' ? Math.max(0, Math.ceil((raid.deadlineAt - Date.now()) / 1000)) : 0,
  );
  const mercCost = $derived((incomePerSecond(game.state)['gold'] ?? 0) * MERC_COST_SECONDS);
  const frenzySeconds = $derived(Math.ceil(game.state.frenzySeconds));

  interface FloatingGain {
    readonly id: number;
    readonly x: number;
    readonly text: string;
    readonly crit: boolean;
    readonly auto: boolean;
  }

  let floats = $state<FloatingGain[]>([]);
  let nextFloatId = 0;

  function addFloat(text: string, crit: boolean, auto = false): void {
    const id = nextFloatId++;
    floats = [...floats.slice(-24), { id, x: (Math.random() - 0.5) * 140, text, crit, auto }];
    setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 900);
  }

  function quest(e: MouseEvent): void {
    // synthetische kliks (console-loops, goedkope extensies) bestaan niet
    if (!e.isTrusted) return;
    const point = { x: e.clientX, y: e.clientY };
    // tijdens een raid vecht de grote knop in plaats van te questen
    if (game.state.raid !== null) {
      if (game.fight(point) === 'won') addFloat('⚔️ VICTORY! War spoils claimed!', true);
      return;
    }
    const outcome = game.quest(point);
    if (outcome === null) return; // boven de cap of robotisch — stil negeren
    addFloat(`${outcome.crit ? 'CRIT! ' : ''}+${formatNumber(outcome.gain.gold ?? 0)}`, outcome.crit);
  }

  // het personeel klikt zichtbaar mee: elke seconde één zachte float met hun opbrengst
  $effect(() => {
    if (autoRate <= 0) return;
    const timer = setInterval(() => addFloat(`📯 +${formatNumber(autoRate)}`, false, true), 1000);
    return () => clearInterval(timer);
  });

  // spatiebalk = quest, waar de focus ook staat. !e.repeat: ingedrukt houden
  // is geen klikken — anders wordt de toets een gratis autoclicker.
  function onKeydown(e: KeyboardEvent): void {
    if (!e.isTrusted || e.code !== 'Space' || e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    e.preventDefault();
    if (game.state.raid !== null) {
      if (game.fight() === 'won') addFloat('⚔️ VICTORY! War spoils claimed!', true);
      return;
    }
    const outcome = game.quest();
    if (outcome === null) return;
    addFloat(`${outcome.crit ? 'CRIT! ' : ''}+${formatNumber(outcome.gain.gold ?? 0)}`, outcome.crit);
  }

</script>

<svelte:window onkeydown={onKeydown} />

<section>
  <h2>Adventurers Guild</h2>
  <p class="dim">Send your guild on quests and recruit heroes to earn gold for you.</p>

  {#if raid !== null}
    <div class="raid-banner" class:plundering={raid.phase === 'plundering'}>
      {#if raid.phase === 'incoming'}
        🪓 <strong>Barbarians approach!</strong> Drive them off — {raid.hitsLeft} hits · {Math.floor(raidSecondsLeft / 60)}:{String(raidSecondsLeft % 60).padStart(2, '0')} left
      {:else}
        🔥 <strong>Barbarians are plundering your guild!</strong> Production halved — fight them off ({raid.hitsLeft} hits)
      {/if}
    </div>
  {:else if frenzySeconds > 0}
    <div class="frenzy-banner">⚔️ War spoils! ×2 production — {frenzySeconds}s</div>
  {/if}

  <div class="quest-area">
    <button class="quest" class:frenzy={game.comboHeat >= 1} class:battle={raid !== null} onclick={quest}>
      <span class="quest-icon">{raid !== null ? '🪓' : '⚔️'}</span>
      {#if raid !== null}
        <span>FIGHT!<br /><small>{raid.hitsLeft} hits left</small></span>
      {:else}
        <span>Run quest<br /><small>+{formatNumber(gain * comboMult)} gold</small></span>
      {/if}
    </button>
    {#each floats as f (f.id)}
      <span class="float" class:crit={f.crit} class:auto={f.auto} style="left: calc(50% + {f.x}px)">{f.text}</span>
    {/each}
  </div>

  {#if raid?.phase === 'incoming' && mercCost > 0}
    <button class="mercs" onclick={() => game.payMercenaries()} disabled={(game.state.balances['gold'] ?? 0) < mercCost}>
      💰 Pay mercenaries to handle it — 🪙 {formatNumber(mercCost)}
    </button>
  {/if}

  {#if maxCombo > 1}
    <div class="combo" class:hot={game.comboHeat >= 1}>
      <div class="combo-bar"><div class="combo-fill" style="width: {game.comboHeat * 100}%"></div></div>
      <span class="combo-label">Combo ×{comboMult.toFixed(1)}</span>
    </div>
  {/if}

  {#if game.robotic}
    <div class="robot">🤖 Suspiciously mechanical fingers — the guild ignores robots.</div>
  {/if}

  <GuildYard />

  <div class="stats">
    <div>Earned this guild era: <strong>{formatNumber(runGold)}</strong> gold</div>
    {#if fameGain(game.state) === 0}
      <div class="dim">
        Next Fame: <strong class="lifetime">{formatNumber(lifetimeGold)}</strong> / {formatNumber(nextTarget)} lifetime gold{#if fameEtaSeconds !== null}{' '}· ~{formatEta(fameEtaSeconds)} at this rate{/if}
      </div>
      <div class="bar"><div class="fill" style="width: {prestigeProgress * 100}%"></div></div>
    {:else}
      <div class="success">👑 Prestige available — check the Prestige tab!</div>
    {/if}
  </div>
</section>

<style>
  section { display: grid; gap: 20px; justify-items: center; padding: 32px; text-align: center; }
  .lifetime { color: var(--gold); font-weight: 600; }
  .dim { color: var(--text-dim); }
  .success { color: var(--success); }
  .quest {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 22px 34px;
    font-size: 1.2rem;
    background: var(--accent);
    color: white;
    border-radius: 999px;
    box-shadow: 0 4px 20px rgb(59 130 246 / 0.5);
  }
  .quest:active { transform: scale(0.97); }
  .quest.frenzy { box-shadow: 0 4px 24px rgb(245 158 11 / 0.7); }
  .quest-icon { font-size: 2rem; }
  .combo { display: flex; align-items: center; gap: 10px; width: min(280px, 100%); }
  .combo-bar {
    flex: 1;
    background: var(--panel-raised);
    border-radius: 999px;
    height: 8px;
    overflow: hidden;
  }
  .combo-fill {
    background: linear-gradient(90deg, var(--accent), var(--gold));
    height: 100%;
    /* geen transition: de breedte volgt de heat per frame al vloeiend */
  }
  .combo-label {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    min-width: 4.5em;
    text-align: left;
  }
  .combo.hot .combo-label { color: var(--gold); font-weight: 600; }
  .robot {
    background: var(--panel-raised);
    border: 1px solid var(--danger);
    color: var(--danger);
    border-radius: var(--radius);
    padding: 8px 14px;
    font-size: 0.9rem;
  }
  .raid-banner {
    background: var(--panel-raised);
    border: 1px solid var(--gold);
    color: var(--gold);
    border-radius: var(--radius);
    padding: 10px 16px;
    animation: raid-pulse 1s ease-in-out infinite;
  }
  .raid-banner.plundering { border-color: var(--danger); color: var(--danger); animation: none; }
  @keyframes raid-pulse {
    50% { border-color: var(--danger); }
  }
  @media (prefers-reduced-motion: reduce) {
    .raid-banner { animation: none; }
  }
  .frenzy-banner {
    background: var(--panel-raised);
    border: 1px solid var(--success);
    color: var(--success);
    border-radius: var(--radius);
    padding: 8px 14px;
  }
  .quest.battle {
    background: var(--danger);
    box-shadow: 0 4px 20px rgb(248 113 113 / 0.5);
  }
  .mercs {
    background: var(--panel-raised);
    color: var(--text);
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 0.9rem;
  }
  .mercs:disabled { opacity: 0.5; }
  .quest-area { position: relative; }
  .float {
    position: absolute;
    top: -6px;
    transform: translateX(-50%);
    color: var(--text);
    font-weight: 600;
    pointer-events: none;
    animation: float-up 0.9s ease-out forwards;
    white-space: nowrap;
  }
  .float.crit {
    color: var(--gold);
    font-size: 1.3rem;
  }
  .float.auto {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-weight: 400;
  }
  @keyframes float-up {
    from { translate: 0 0; opacity: 1; }
    to { translate: 0 -48px; opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .float { animation-duration: 0.5s; }
  }
  .stats { display: grid; gap: 8px; width: min(420px, 100%); }
  .bar { background: var(--panel-raised); border-radius: 999px; height: 10px; overflow: hidden; }
  .fill { background: var(--success); height: 100%; }
</style>
