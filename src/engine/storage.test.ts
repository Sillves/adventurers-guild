import { describe, expect, it } from 'vitest';
import { RotatingSaveStorage, type SaveStore } from './storage';

function memoryStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
  };
}

const accept = (s: string): unknown | null => s; // alles geldig
const onlyV2 = (s: string): unknown | null => (s === 'v2' ? s : null);

describe('RotatingSaveStorage', () => {
  it('saves to the primary slot', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v1');
    expect(storage.load(accept)).toBe('v1');
  });

  it('rotates older saves into backup slots', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v1');
    storage.save('v2');
    storage.save('v3');
    expect(store.data.get('ag.save.0')).toBe('v3');
    expect(store.data.get('ag.save.1')).toBe('v2');
    expect(store.data.get('ag.save.2')).toBe('v1');
  });

  it('falls back to the newest backup that parses', () => {
    const store = memoryStore();
    const storage = new RotatingSaveStorage(store);
    storage.save('v2');
    storage.save('corrupt');
    expect(storage.load(onlyV2)).toBe('v2');
  });

  it('returns null when nothing valid exists', () => {
    const storage = new RotatingSaveStorage(memoryStore());
    expect(storage.load(accept)).toBeNull();
  });
});
