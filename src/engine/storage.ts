export interface SaveStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

const KEYS = ['ag.save.0', 'ag.save.1', 'ag.save.2'] as const;

export class RotatingSaveStorage {
  constructor(private readonly store: SaveStore) {}

  save(data: string): void {
    const current = this.store.read(KEYS[0]);
    const previous = this.store.read(KEYS[1]);
    if (previous !== null) this.store.write(KEYS[2], previous);
    if (current !== null) this.store.write(KEYS[1], current);
    this.store.write(KEYS[0], data);
  }

  load(parse: (data: string) => unknown | null): string | null {
    for (const key of KEYS) {
      const data = this.store.read(key);
      if (data !== null && parse(data) !== null) return data;
    }
    return null;
  }
}

export const localStorageStore: SaveStore = {
  read: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('save: failed to write to localStorage', error);
    }
  },
};
