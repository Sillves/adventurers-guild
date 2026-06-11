import { applyOffline, advance, type OfflineReport } from '../engine/advance';
import * as commands from '../engine/commands';
import { clickOutcome, comboCap, type ClickOutcome } from '../engine/formulas';
import { parseSave, serializeSave } from '../engine/save';
import { leaderboard } from './leaderboard.svelte';
import { createInitialState, type GameState } from '../engine/state';
import { localStorageStore, RotatingSaveStorage } from '../engine/storage';
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

  quest(): ClickOutcome {
    startMusic();
    const roll = Math.random();
    const outcome = clickOutcome(state, roll, this.comboMultiplier);
    playSound(outcome.crit ? 'buy' : 'click');
    state = commands.performQuest(state, roll, this.comboMultiplier);
    comboHeat = Math.min(1, comboHeat + 1 / COMBO_CLICKS_TO_FULL);
    lastQuestAt = performance.now();
    clickWindow = [...clickWindow, { t: lastQuestAt, gold: outcome.gain.gold ?? 0 }];
    return outcome;
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
