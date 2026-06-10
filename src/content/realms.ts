import type { RealmDef } from './types';

export const REALMS: readonly RealmDef[] = [
  { id: 'verdant', name: 'The Verdant Realm', accentColor: '#3b82f6', unlock: { minFame: 0 } },
] as const;
