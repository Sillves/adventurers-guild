import { applyOffline, advance, type OfflineReport } from '../engine/advance';
import * as commands from '../engine/commands';
import { parseSave, serializeSave } from '../engine/save';
import { createInitialState, type GameState } from '../engine/state';
import { localStorageStore, RotatingSaveStorage } from '../engine/storage';

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

  quest(): void {
    state = commands.performQuest(state);
  },
  buyHero(heroId: string): void {
    state = commands.buyHero(state, heroId);
  },
  buyUpgrade(upgradeId: string): void {
    state = commands.buyUpgrade(state, upgradeId);
  },
  prestige(): void {
    state = commands.doPrestige(state, Date.now());
    persist();
  },
  dismissOffline(): void {
    offlineReport = null;
  },
};
