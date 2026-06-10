import type { CurrencyMap } from '../content/types';

export function addMaps(a: CurrencyMap, b: CurrencyMap): CurrencyMap {
  const result: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

export function subtractMaps(a: CurrencyMap, b: CurrencyMap): CurrencyMap {
  return addMaps(a, scaleMap(b, -1));
}

export function scaleMap(map: CurrencyMap, factor: number): CurrencyMap {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    result[key] = value * factor;
  }
  return result;
}

export function canAfford(balances: CurrencyMap, cost: CurrencyMap): boolean {
  return Object.entries(cost).every(([key, value]) => (balances[key] ?? 0) >= value);
}
