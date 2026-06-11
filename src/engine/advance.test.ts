import { describe, expect, it } from 'vitest';
import { advance, applyOffline, OFFLINE_CAP_SECONDS } from './advance';
import { createInitialState } from './state';

const producing = {
  ...createInitialState(0),
  heroes: { farmhand: 10 }, // 10 * 0.5 = 5 gold/sec
};

describe('advance', () => {
  it('adds production * seconds to balances and runEarned', () => {
    const after = advance(producing, 10);
    expect(after.balances.gold).toBe(50);
    expect(after.runEarned.gold).toBe(50);
  });

  it('handles large time jumps in one call', () => {
    const after = advance(producing, 8 * 3600);
    expect(after.balances.gold).toBe(5 * 8 * 3600);
  });

  it('returns same state for zero or negative time', () => {
    expect(advance(producing, 0)).toBe(producing);
    expect(advance(producing, -5)).toBe(producing);
  });

  it('auto-clicks quest alongside hero production, also offline', () => {
    const state = { ...producing, upgrades: ['quest-herald'], lastSavedAt: 0 };
    // 5 gold/s productie + 1 auto-quest/s à 1 goud
    expect(advance(state, 10).balances.gold).toBe(60);
    const { report } = applyOffline(state, 600_000);
    expect(report?.earned.gold).toBe(6 * 600);
  });
});

describe('applyOffline', () => {
  it('grants production for elapsed time since lastSavedAt', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const { state: after, report } = applyOffline(state, 600_000); // 10 min later
    expect(after.balances.gold).toBe(5 * 600);
    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(600);
    expect(report?.earned.gold).toBe(5 * 600);
  });

  it('caps offline time at 8 hours', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const tenHoursLater = 10 * 3600 * 1000;
    const { state: after, report } = applyOffline(state, tenHoursLater);
    expect(report?.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(after.balances.gold).toBe(5 * OFFLINE_CAP_SECONDS);
  });

  it('skips the report for less than a minute away', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const { state: after, report } = applyOffline(state, 30_000);
    expect(report).toBeNull();
    expect(after).toBe(state);
  });

  it('never goes backwards in time', () => {
    const state = { ...producing, lastSavedAt: 1_000_000 };
    const { report } = applyOffline(state, 0);
    expect(report).toBeNull();
  });
});
