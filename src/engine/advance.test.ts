import { describe, expect, it } from 'vitest';
import { advance, applyOffline, OFFLINE_CAP_SECONDS } from './advance';
import { createInitialState } from './state';

const producing = {
  ...createInitialState(0),
  heroes: { farmhand: 10 }, // 10 × 0.5 × mijlpaal(10) ×1.25 = 6.25 gold/s
};

describe('advance', () => {
  it('adds production * seconds to balances and runEarned', () => {
    const after = advance(producing, 10);
    expect(after.balances.gold).toBe(62.5);
    expect(after.runEarned.gold).toBe(62.5);
  });

  it('handles large time jumps in one call', () => {
    const after = advance(producing, 8 * 3600);
    expect(after.balances.gold).toBe(6.25 * 8 * 3600);
  });

  it('returns same state for zero or negative time', () => {
    expect(advance(producing, 0)).toBe(producing);
    expect(advance(producing, -5)).toBe(producing);
  });

  it('auto-clicks quest alongside hero production, also offline', () => {
    const state = { ...producing, upgrades: ['quest-herald'], lastSavedAt: 0 };
    // 6.25 gold/s productie + 1 auto-quest/s à 1 goud
    expect(advance(state, 10).balances.gold).toBe(72.5);
    const { report } = applyOffline(state, 600_000);
    expect(report?.earned.gold).toBe(7.25 * 600);
  });
});

describe('applyOffline', () => {
  it('grants production for elapsed time since lastSavedAt', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const { state: after, report } = applyOffline(state, 600_000); // 10 min later
    expect(after.balances.gold).toBe(6.25 * 600);
    expect(report).not.toBeNull();
    expect(report?.seconds).toBe(600);
    expect(report?.earned.gold).toBe(6.25 * 600);
  });

  it('caps offline time at 8 hours', () => {
    const state = { ...producing, lastSavedAt: 0 };
    const tenHoursLater = 10 * 3600 * 1000;
    const { state: after, report } = applyOffline(state, tenHoursLater);
    expect(report?.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(after.balances.gold).toBe(6.25 * OFFLINE_CAP_SECONDS);
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

describe('raids and frenzy in the passage of time', () => {
  it('halves production while barbarians are plundering', () => {
    const state = { ...producing, raid: { phase: 'plundering' as const, hitsLeft: 25 } };
    expect(advance(state, 10).balances.gold).toBe(31.25); // 6.25/s × 0.5 × 10s
  });

  it('doubles production during a frenzy and splits exactly at its end', () => {
    const state = { ...producing, frenzySeconds: 4 };
    // 4s × 12.5/s (verdubbeld) + 6s × 6.25/s = 87.5
    const after = advance(state, 10);
    expect(after.balances.gold).toBe(87.5);
    expect(after.frenzySeconds).toBe(0);
    const mid = advance(state, 3);
    expect(mid.frenzySeconds).toBe(1);
    expect(mid.balances.gold).toBe(37.5);
  });

  it('applyOffline resolves a crossed raid deadline at the exact moment', () => {
    const state = {
      ...producing,
      balances: { gold: 1000, fame: 0 },
      raid: { phase: 'incoming' as const, deadlineAt: 100_000, hitsLeft: 25 },
      lastSavedAt: 0,
    };
    // 10 min weg: 100s normaal (6.25/s), dan plundering, daarna 500s op
    // halve productie (3.125/s)
    const { state: after, report } = applyOffline(state, 600_000);
    expect(after.raid?.phase).toBe('plundering');
    // kas op de deadline: 1000 + 625 = 1625 → ×0.8 = 1300, daarna +1562.5
    expect(after.balances.gold).toBeCloseTo(1300 + 1562.5);
    expect(report?.earned.gold).toBeCloseTo(625 + 1562.5);
  });

  it('leaves the raid untouched when the deadline has not passed', () => {
    const state = {
      ...producing,
      raid: { phase: 'incoming' as const, deadlineAt: 900_000, hitsLeft: 25 },
      lastSavedAt: 0,
    };
    const { state: after } = applyOffline(state, 600_000);
    expect(after.raid?.phase).toBe('incoming');
  });
});
