import { applyOffline, advance, type OfflineReport } from '../engine/advance';
import * as commands from '../engine/commands';
import { clickOutcome, type ClickOutcome } from '../engine/formulas';
import { parseSave, serializeSave } from '../engine/save';
import { createInitialState, type GameState } from '../engine/state';
import { localStorageStore, RotatingSaveStorage } from '../engine/storage';
import { playSound, startMusic } from './sound';

const storage = new RotatingSaveStorage(localStorageStore);

let state = $state.raw<GameState>(createInitialState(Date.now()));
let offlineReport = $state.raw<OfflineReport | null>(null);
let lastTick = 0;

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
      state = advance(state, (now - lastTick) / 1000);
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

  quest(): ClickOutcome {
    startMusic();
    const roll = Math.random();
    const outcome = clickOutcome(state, roll);
    playSound(outcome.crit ? 'buy' : 'click');
    state = commands.performQuest(state, roll);
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
    if (next !== state) playSound('prestige');
    state = next;
    persist();
  },
  dismissOffline(): void {
    offlineReport = null;
  },
  exportSave(): string {
    persist();
    return serializeSave(state);
  },
  importSave(json: string): boolean {
    const parsed = parseSave(json);
    if (parsed === null) return false;
    const result = applyOffline(parsed, Date.now());
    state = result.state;
    offlineReport = result.report;
    persist();
    return true;
  },
};
