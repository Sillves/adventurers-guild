// Leaderboard-client: opt-in identiteit, gethrottlede submissions en het
// ophalen van de ranglijst. Het spel hangt nooit af van deze API — elke
// fout degradeert stil naar "bord even niet beschikbaar".
import type { GameState } from '../engine/state';

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8787'
  : 'https://adventurers-guild-api.sillves.workers.dev';

const OPT_IN_KEY = 'ag.lb.optIn';
const PLAYER_ID_KEY = 'ag.lb.playerId';
const NAME_KEY = 'ag.lb.name';
const LAST_SUBMIT_KEY = 'ag.lb.lastSubmit';

// server weigert < 4 min; client houdt ruime marge aan
const SUBMIT_INTERVAL_MS = 5 * 60 * 1000;

export interface BoardEntry {
  readonly rank: number;
  readonly name: string;
  readonly fame: number;
  readonly lifetimeGold: number;
  readonly prestiges: number;
  readonly flagged: boolean;
  readonly flagLabel: string | null;
  readonly me: boolean;
  readonly updatedAt: number;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // best-effort
  }
}

let optIn = $state(read(OPT_IN_KEY) === '1');
let playerName = $state(read(NAME_KEY) ?? '');
let board = $state<BoardEntry[]>([]);
let boardState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
let fetchedAt = $state(0);

function playerId(): string {
  let id = read(PLAYER_ID_KEY);
  if (id === null) {
    id = crypto.randomUUID();
    write(PLAYER_ID_KEY, id);
  }
  return id;
}

async function submit(state: GameState): Promise<void> {
  write(LAST_SUBMIT_KEY, String(Date.now()));
  try {
    await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: playerId(),
        name: playerName,
        fame: state.balances['fame'] ?? 0,
        lifetimeGold: state.lifetimeEarned['gold'] ?? 0,
        prestiges: state.prestiges,
      }),
    });
  } catch {
    // offline of API plat — volgende poging komt vanzelf
  }
}

export const leaderboard = {
  get optIn(): boolean {
    return optIn;
  },
  get name(): string {
    return playerName;
  },
  get board(): BoardEntry[] {
    return board;
  },
  get state(): 'idle' | 'loading' | 'ready' | 'error' {
    return boardState;
  },
  get fetchedAt(): number {
    return fetchedAt;
  },

  async join(name: string, gameState: GameState): Promise<void> {
    const trimmed = name.trim().slice(0, 20);
    if (trimmed.length === 0) return;
    playerName = trimmed;
    optIn = true;
    write(NAME_KEY, trimmed);
    write(OPT_IN_KEY, '1');
    await submit(gameState);
    await this.refresh();
  },

  leave(): void {
    optIn = false;
    write(OPT_IN_KEY, '0');
  },

  rename(name: string, gameState: GameState): void {
    const trimmed = name.trim().slice(0, 20);
    if (trimmed.length === 0) return;
    playerName = trimmed;
    write(NAME_KEY, trimmed);
    void submit(gameState);
  },

  /** Periodieke kans om te submitten; respecteert de throttle. */
  maybeSubmit(gameState: GameState): void {
    if (!optIn) return;
    const last = Number(read(LAST_SUBMIT_KEY)) || 0;
    if (Date.now() - last < SUBMIT_INTERVAL_MS) return;
    void submit(gameState);
  },

  /** Direct na een prestige: het moment dat telt voor het bord. */
  submitNow(gameState: GameState): void {
    if (!optIn) return;
    void submit(gameState);
  },

  async refresh(): Promise<void> {
    boardState = 'loading';
    try {
      const me = optIn ? `&me=${playerId()}` : '';
      const res = await fetch(`${API_BASE}/top?limit=50${me}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { players: BoardEntry[] };
      board = data.players;
      fetchedAt = Date.now();
      boardState = 'ready';
    } catch {
      boardState = 'error';
    }
  },
};
