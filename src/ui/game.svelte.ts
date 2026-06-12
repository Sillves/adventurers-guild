import { applyOffline, advance, type OfflineReport } from '../engine/advance';
import * as commands from '../engine/commands';
import { clickOutcome, comboCap, type ClickOutcome } from '../engine/formulas';
import { parseSave, serializeSave } from '../engine/save';
import { leaderboard } from './leaderboard.svelte';
import { createInitialState, type GameState } from '../engine/state';
import { localStorageStore, RotatingSaveStorage } from '../engine/storage';
import { ClickGuard, ROBOTIC_LABEL_MS } from './clickguard';
import { playSound, startMusic } from './sound';

const storage = new RotatingSaveStorage(localStorageStore);

let state = $state.raw<GameState>(createInitialState(Date.now()));
let offlineReport = $state.raw<OfflineReport | null>(null);
let lastTick = 0;

// Combo-heat is bewust ephemeral (nooit in de save): hij beloont kliks NU.
// ~20 kliks naar vol; na 1s stilte loopt hij in 2s leeg.
const COMBO_CLICKS_TO_FULL = 20;
const COMBO_IDLE_MS = 1000;
const COMBO_DRAIN_PER_SECOND = 0.5;
let comboHeat = $state(0);
let lastQuestAt = 0;

// Voortschrijdend venster van échte klikopbrengsten (incl. crits en combo),
// zodat de UI kan tonen wat je vingers per seconde waard zijn.
const CLICK_WINDOW_MS = 5000;
let clickWindow = $state.raw<ReadonlyArray<{ readonly t: number; readonly gold: number }>>([]);

// autoclicker-verdediging: cap op 15 kliks/s + ritmedetectie (zie clickguard.ts)
const guard = new ClickGuard();
let robotic = $state(false);
let lastGuardedAt = 0;

// Raid-spawner: alleen tijdens actieve speeltijd (tab zichtbaar), elke 10-20
// minuten. De teller is ephemeral — de tab sluiten pauzeert hem, een lopende
// raid zelf staat wél in de save (en lost offline op via applyOffline).
const RAID_SPAWN_MIN_S = 600;
const RAID_SPAWN_MAX_S = 1200;
let activeSeconds = 0;
let nextRaidAtActive = RAID_SPAWN_MIN_S + Math.random() * (RAID_SPAWN_MAX_S - RAID_SPAWN_MIN_S);

function persist(): void {
  state = { ...state, lastSavedAt: Date.now() };
  storage.save(serializeSave(state));
}

export const game = {
  get state(): GameState {
    return state;
  },
  get offlineReport(): OfflineReport | null {
    return offlineReport;
  },

  init(): void {
    const data = storage.load(parseSave);
    if (data !== null) {
      const loaded = parseSave(data);
      if (loaded !== null) {
        const result = applyOffline(loaded, Date.now());
        state = result.state;
        offlineReport = result.report;
      }
    }
    lastTick = performance.now();
    const tick = (now: number): void => {
      const dt = (now - lastTick) / 1000;
      state = advance(state, dt);
      if (comboHeat > 0 && now - lastQuestAt > COMBO_IDLE_MS) {
        comboHeat = Math.max(0, comboHeat - dt * COMBO_DRAIN_PER_SECOND);
      }
      if (clickWindow.length > 0 && clickWindow[0].t < now - CLICK_WINDOW_MS) {
        clickWindow = clickWindow.filter((c) => c.t >= now - CLICK_WINDOW_MS);
      }
      // de 🤖-banner dooft vanzelf zodra het robotische geklik stopt
      if (robotic && now - lastGuardedAt > ROBOTIC_LABEL_MS) robotic = false;
      if (!document.hidden) {
        activeSeconds += dt;
        if (state.raid === null && activeSeconds >= nextRaidAtActive) {
          const raided = commands.startRaid(state, Date.now());
          if (raided !== state) {
            state = raided;
            playSound('raid');
          } else {
            // nog geen 50 fame: probeer het over een paar minuten opnieuw
            nextRaidAtActive = activeSeconds + RAID_SPAWN_MIN_S / 2;
          }
        }
        if (state.raid?.phase === 'incoming' && Date.now() >= state.raid.deadlineAt) {
          state = commands.raidDeadline(state, Date.now());
          playSound('raid'); // de hoorn klinkt opnieuw: nu wordt er geplunderd
        }
      }
      lastTick = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(persist, 30_000);
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) persist();
    });
  },

  // Heat van vóór deze klik telt: de combo beloont de reeks, niet de klik zelf.
  get comboHeat(): number {
    return comboHeat;
  },
  get comboMultiplier(): number {
    return 1 + comboHeat * (comboCap(state.upgrades) - 1);
  },
  /** Gemeten klikinkomsten over de laatste 5 s, als goud per seconde. */
  get clickIncomeRate(): number {
    let sum = 0;
    for (const c of clickWindow) sum += c.gold;
    return sum / (CLICK_WINDOW_MS / 1000);
  },

  get robotic(): boolean {
    return robotic;
  },

  quest(point: { x: number; y: number } | null = null): ClickOutcome | null {
    startMusic();
    const now = performance.now();
    const verdict = guard.record(now, point?.x ?? null, point?.y ?? null);
    lastGuardedAt = now;
    robotic = verdict.robotic;
    // boven de cap of robotisch: de klik bestaat gewoon niet voor de guild
    if (!verdict.earned) return null;
    const roll = Math.random();
    const outcome = clickOutcome(state, roll, this.comboMultiplier);
    playSound(outcome.crit ? 'buy' : 'click');
    state = commands.performQuest(state, roll, this.comboMultiplier);
    comboHeat = Math.min(1, comboHeat + 1 / COMBO_CLICKS_TO_FULL);
    lastQuestAt = now;
    clickWindow = [...clickWindow, { t: now, gold: outcome.gain.gold ?? 0 }];
    return outcome;
  },
  /**
   * Eén mep op de barbaren. Zelfde guard als quests: autoclickers vechten niet
   * mee. Retourneert 'won' bij de beslissende mep (de UI viert dat).
   */
  fight(point: { x: number; y: number } | null = null): 'hit' | 'won' | null {
    startMusic();
    const now = performance.now();
    const verdict = guard.record(now, point?.x ?? null, point?.y ?? null);
    lastGuardedAt = now;
    robotic = verdict.robotic;
    if (!verdict.earned || state.raid === null) return null;
    const phase = state.raid.phase;
    state = commands.fightRaid(state);
    if (state.raid === null) {
      playSound('prestige');
      nextRaidAtActive = activeSeconds + RAID_SPAWN_MIN_S + Math.random() * (RAID_SPAWN_MAX_S - RAID_SPAWN_MIN_S);
      return phase === 'incoming' ? 'won' : 'hit';
    }
    playSound('click');
    return 'hit';
  },

  payMercenaries(): void {
    const next = commands.payMercenaries(state);
    if (next !== state) {
      playSound('buy');
      nextRaidAtActive = activeSeconds + RAID_SPAWN_MIN_S + Math.random() * (RAID_SPAWN_MAX_S - RAID_SPAWN_MIN_S);
    }
    state = next;
  },

  buyHero(heroId: string, count = 1): void {
    startMusic();
    const next = commands.buyHero(state, heroId, count);
    if (next !== state) playSound('buy');
    state = next;
  },
  buyUpgrade(upgradeId: string): void {
    startMusic();
    const next = commands.buyUpgrade(state, upgradeId);
    if (next !== state) playSound('buy');
    state = next;
  },
  prestige(): void {
    const next = commands.doPrestige(state, Date.now());
    if (next !== state) {
      playSound('prestige');
      state = next;
      comboHeat = 0;
      persist();
      // hét moment dat telt voor het bord
      leaderboard.submitNow(state);
      return;
    }
    state = next;
  },
  dismissOffline(): void {
    offlineReport = null;
  },
  exportSave(): string {
    persist();
    // leaderboard-identiteit verhuist mee met de save (parseSave negeert het veld)
    const raw = JSON.parse(serializeSave(state)) as Record<string, unknown>;
    const identity = leaderboard.identity();
    if (identity !== null) raw.leaderboard = identity;
    return JSON.stringify(raw);
  },
  importSave(json: string): boolean {
    const parsed = parseSave(json);
    if (parsed === null) return false;
    try {
      leaderboard.adoptIdentity((JSON.parse(json) as Record<string, unknown>).leaderboard);
    } catch {
      // identiteit is optioneel; de save zelf is al gevalideerd
    }
    const result = applyOffline(parsed, Date.now());
    state = result.state;
    offlineReport = result.report;
    persist();
    return true;
  },
};
