import type { CurrencyDef } from './types';

export const CURRENCIES: readonly CurrencyDef[] = [
  { id: 'gold', name: 'Gold', icon: '🪙' },
  { id: 'fame', name: 'Fame', icon: '🏆' },
] as const;
