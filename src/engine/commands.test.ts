import { describe, expect, it } from 'vitest';
import { buyHero, buyUpgrade, doPrestige, fightRaid, payMercenaries, performQuest, raidDeadline, startRaid } from './commands';
import { createInitialState } from './state';

describe('performQuest', () => {
  it('adds click gain to balances, runEarned and lifetimeEarned, immutably', () => {
    const before = createInitialState(0);
    const after = performQuest(before);
    expect(after.balances.gold).toBe(1);
    expect(after.runEarned.gold).toBe(1);
    expect(after.lifetimeEarned.gold).toBe(1);
    expect(before.balances.gold).toBe(0);
  });

  it('applies the crit multiplier when the roll crits', () => {
    const state = { ...createInitialState(0), upgrades: ['lucky-strikes'] };
    expect(performQuest(state, 0.01).balances.gold).toBe(10);
    expect(performQuest(state, 0.99).balances.gold).toBe(1);
  });

  it('applies the combo multiplier, clamped to the unlocked cap', () => {
    const state = { ...createInitialState(0), upgrades: ['battle-rhythm'] };
    expect(performQuest(state, 1, 2).balances.gold).toBe(2);
    expect(performQuest(state, 1, 99).balances.gold).toBe(2);
    expect(performQuest(createInitialState(0), 1, 2).balances.gold).toBe(1);
  });
});

describe('buyHero', () => {
  it('deducts cost and increments count', () => {
    const state = { ...createInitialState(0), balances: { gold: 20, fame: 0 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(1);
    expect(after.balances.gold).toBe(5);
  });

  it('returns same state when unaffordable or unknown', () => {
    const state = { ...createInitialState(0), balances: { gold: 5, fame: 0 } };
    expect(buyHero(state, 'farmhand')).toBe(state);
    expect(buyHero(state, 'nonexistent')).toBe(state);
  });

  it('uses scaled cost for subsequent purchases', () => {
    const state = { ...createInitialState(0), balances: { gold: 1000, fame: 0 }, heroes: { farmhand: 5 } };
    const after = buyHero(state, 'farmhand');
    expect(after.heroes.farmhand).toBe(6);
    expect(after.balances.gold).toBe(1000 - Math.ceil(15 * Math.pow(1.15, 5)));
  });

  it('buys multiple heroes at once for the exact summed cost', () => {
    // farmhand: 15 + 18 = 33 voor de eerste twee
    const state = { ...createInitialState(0), balances: { gold: 33, fame: 0 } };
    const after = buyHero(state, 'farmhand', 2);
    expect(after.heroes.farmhand).toBe(2);
    expect(after.balances.gold).toBe(0);
    const broke = { ...createInitialState(0), balances: { gold: 32, fame: 0 } };
    expect(buyHero(broke, 'farmhand', 2)).toBe(broke);
    expect(buyHero(state, 'farmhand', 0)).toBe(state);
    expect(buyHero(state, 'farmhand', 1.5)).toBe(state);
  });
});

describe('buyUpgrade', () => {
  it('refuses an upgrade whose prerequisite is not yet purchased', () => {
    const rich = { ...createInitialState(0), balances: { gold: 1_000_000, fame: 0 }, heroes: { farmhand: 1 } };
    expect(buyUpgrade(rich, 'steel-pitchforks')).toBe(rich);
    const withTier1 = { ...rich, upgrades: ['iron-pitchforks'] };
    const after = buyUpgrade(withTier1, 'steel-pitchforks');
    expect(after.upgrades).toContain('steel-pitchforks');
  });

  it('refuses a hero upgrade until you own at least one of that hero', () => {
    const rich = { ...createInitialState(0), balances: { gold: 1_000_000, fame: 0 } };
    expect(buyUpgrade(rich, 'iron-pitchforks')).toBe(rich);
    const withHero = { ...rich, heroes: { farmhand: 1 } };
    expect(buyUpgrade(withHero, 'iron-pitchforks').upgrades).toContain('iron-pitchforks');
    // niet-held-upgrades blijven gewoon koopbaar zonder helden
    expect(buyUpgrade(rich, 'stronger-grip').upgrades).toContain('stronger-grip');
  });

  it('deducts cost and records the upgrade', () => {
    const state = { ...createInitialState(0), balances: { gold: 500, fame: 0 } };
    const after = buyUpgrade(state, 'stronger-grip');
    expect(after.upgrades).toContain('stronger-grip');
    expect(after.balances.gold).toBe(400);
  });

  it('rejects duplicates, unknown ids and unaffordable buys', () => {
    const broke = { ...createInitialState(0), balances: { gold: 1, fame: 0 } };
    expect(buyUpgrade(broke, 'stronger-grip')).toBe(broke);
    expect(buyUpgrade(broke, 'nope')).toBe(broke);
    const owned = { ...createInitialState(0), balances: { gold: 500, fame: 0 }, upgrades: ['stronger-grip'] };
    expect(buyUpgrade(owned, 'stronger-grip')).toBe(owned);
  });
});

describe('doPrestige', () => {
  it('does nothing below 1 fame gain', () => {
    const state = { ...createInitialState(0), lifetimeEarned: { gold: 999_999 } };
    expect(doPrestige(state, 123)).toBe(state);
  });

  it('does nothing when lifetime gold only re-covers already-owned fame', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 2_000_000, fame: 2 },
      lifetimeEarned: { gold: 5_000_000 }, // fame 3 vergt 9M lifetime
    };
    expect(doPrestige(state, 123)).toBe(state);
  });

  it('resets the run, banks fame and keeps lifetimeEarned', () => {
    const state = {
      ...createInitialState(0),
      balances: { gold: 5_000_000, fame: 2 },
      runEarned: { gold: 9_000_000 },
      lifetimeEarned: { gold: 25_000_000 }, // totaal 5 fame waard
      heroes: { farmhand: 50 },
      upgrades: ['stronger-grip'],
    };
    const after = doPrestige(state, 123);
    expect(after.balances.fame).toBe(5); // 2 bestaand + 3 nieuw
    expect(after.balances.gold).toBe(0);
    expect(after.heroes).toEqual({});
    expect(after.upgrades).toEqual([]);
    expect(after.runEarned).toEqual({});
    expect(after.lifetimeEarned).toEqual({ gold: 25_000_000 });
    expect(after.prestiges).toBe(1);
    expect(after.lastSavedAt).toBe(123);
  });
});

describe('barbarian raids', () => {
  const veteran = () => ({
    ...createInitialState(0),
    balances: { gold: 10_000, fame: 50 },
    heroes: { farmhand: 10 }, // 5 gold/s × fame-bonus 2 × mijlpaal ×1.25 = 12.5/s
  });

  it('startRaid requires 50 fame and no running raid', () => {
    const fresh = createInitialState(0);
    expect(startRaid(fresh, 1000)).toBe(fresh);
    const state = startRaid(veteran(), 1000);
    expect(state.raid).toEqual({ phase: 'incoming', deadlineAt: 121_000, hitsLeft: 25 });
    expect(startRaid(state, 5000)).toBe(state);
  });

  it('25 hits during incoming wins loot (5 min income) plus a 60s frenzy', () => {
    let state = startRaid(veteran(), 0);
    for (let i = 0; i < 24; i++) state = fightRaid(state);
    expect(state.raid?.hitsLeft).toBe(1);
    const before = state.balances['gold'] ?? 0;
    state = fightRaid(state);
    expect(state.raid).toBeNull();
    expect(state.frenzySeconds).toBe(60);
    // 12.5/s × 300s = 3750 buit
    expect((state.balances['gold'] ?? 0) - before).toBeCloseTo(3750);
  });

  it('paying mercenaries clears the raid for 5 min income, no loot', () => {
    const state = startRaid(veteran(), 0);
    const paid = payMercenaries(state);
    expect(paid.raid).toBeNull();
    expect(paid.frenzySeconds).toBe(0);
    expect(paid.balances['gold']).toBeCloseTo(10_000 - 3750);
    // niet betaalbaar → raid blijft staan
    const broke = { ...state, balances: { ...state.balances, gold: 100 } };
    expect(payMercenaries(broke)).toBe(broke);
  });

  it('a missed deadline plunders 20% of gold and starts the plundering phase', () => {
    const state = startRaid(veteran(), 0);
    expect(raidDeadline(state, 119_999)).toBe(state);
    const plundered = raidDeadline(state, 120_000);
    expect(plundered.balances['gold']).toBeCloseTo(8000);
    expect(plundered.raid).toEqual({ phase: 'plundering', hitsLeft: 25 });
  });

  it('beating off plunderers restores production but pays nothing', () => {
    let state = raidDeadline(startRaid(veteran(), 0), 120_000);
    const goldAfterPlunder = state.balances['gold'] ?? 0;
    for (let i = 0; i < 25; i++) state = fightRaid(state);
    expect(state.raid).toBeNull();
    expect(state.frenzySeconds).toBe(0);
    expect(state.balances['gold']).toBeCloseTo(goldAfterPlunder);
  });

  it('prestige clears any raid and frenzy with the era', () => {
    const raided = {
      ...startRaid(veteran(), 0),
      lifetimeEarned: { gold: 90_000_000_000 },
    };
    const after = doPrestige(raided, 123);
    expect(after.raid).toBeNull();
    expect(after.frenzySeconds).toBe(0);
  });
});
