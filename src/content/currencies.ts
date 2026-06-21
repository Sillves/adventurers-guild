import type { CurrencyDef } from './types';

export const CURRENCIES: readonly CurrencyDef[] = [
  { id: 'gold', name: 'Gold', icon: 'sprites/coin.png' },
  { id: 'fame', name: 'Fame', icon: 'sprites/fame.png' },
] as const;
