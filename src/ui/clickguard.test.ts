import { describe, expect, it } from 'vitest';
import { ClickGuard } from './clickguard';

/** Menselijke kliks: ~6/s met 20% jitter. */
function humanClicks(guard: ClickGuard, count: number, startT = 0): boolean[] {
  const earned: boolean[] = [];
  let t = startT;
  for (let i = 0; i < count; i++) {
    // deterministische pseudo-jitter, ruim boven de 4%-drempel
    t += 160 + ((i * 37) % 60);
    earned.push(guard.record(t).earned);
  }
  return earned;
}

describe('ClickGuard', () => {
  it('lets human-paced jittery clicking through untouched', () => {
    const guard = new ClickGuard();
    expect(humanClicks(guard, 40).every(Boolean)).toBe(true);
    expect(guard.robotic).toBe(false);
  });

  it('lets FAST but jittery clicking through — parked cursors are not bots', () => {
    const guard = new ClickGuard();
    let t = 0;
    const earned: boolean[] = [];
    // ~9 kliks/s met 12% jitter: een mens die op zijn Mac los gaat
    for (let i = 0; i < 40; i++) {
      t += 100 + ((i * 17) % 26);
      earned.push(guard.record(t).earned);
    }
    expect(earned.every(Boolean)).toBe(true);
    expect(guard.robotic).toBe(false);
  });

  it('a steady human spamming for a long stretch never gets flagged — frenzy fingers', () => {
    // Johans geval: raid winnen en de hele ×2-frenzy doorklikken op topsnelheid.
    // ~6,5 kliks/s met maar ~3% jitter, honderden vensters lang: geen 🤖.
    const guard = new ClickGuard();
    let t = 0;
    for (let i = 0; i < 400; i++) {
      t += 150 + ((i * 13) % 16);
      const v = guard.record(t);
      expect(v.robotic, `klik ${i}`).toBe(false);
    }
  });

  it('caps earnings above 15 clicks per second', () => {
    const guard = new ClickGuard();
    const earned: boolean[] = [];
    // 25 kliks in één seconde, met jitter (geen metronoom)
    let t = 0;
    for (let i = 0; i < 25; i++) {
      t += 35 + ((i * 13) % 14);
      earned.push(guard.record(t).earned);
    }
    expect(earned.slice(0, 15).every(Boolean)).toBe(true);
    expect(earned.slice(15).some(Boolean)).toBe(false);
  });

  it('flags metronome timing as robotic and stops paying', () => {
    const guard = new ClickGuard();
    let verdictRobotic = false;
    let lastEarned = true;
    for (let i = 1; i <= 35; i++) {
      const v = guard.record(i * 200); // perfect 200ms-ritme
      verdictRobotic = v.robotic;
      lastEarned = v.earned;
    }
    expect(verdictRobotic).toBe(true);
    expect(lastEarned).toBe(false);
  });

  it('the robotic label expires once the pattern stops', () => {
    const guard = new ClickGuard();
    for (let i = 1; i <= 35; i++) guard.record(i * 100);
    expect(guard.robotic).toBe(true);
    // 5 s later, één eerlijke klik: label is verlopen en de klik telt weer
    const v = guard.record(35 * 100 + 5000);
    expect(v.robotic).toBe(false);
    expect(v.earned).toBe(true);
  });

  it("catches Sam's randomized autoclicker on endurance — no human clicks 4 minutes without a breather", () => {
    // ~8/s met 0-40ms random jitter: CV ~10%, glipt netjes door de ritmecheck…
    const guard = new ClickGuard();
    let t = 0;
    let flaggedAt = -1;
    for (let i = 0; i < 2600; i++) {
      t += 100 + ((i * 37) % 41);
      const v = guard.record(t);
      if (t < 240_000) {
        expect(v.robotic, `klik ${i} (t=${t}ms) te vroeg geflagd`).toBe(false);
      } else if (flaggedAt < 0 && v.robotic) {
        flaggedAt = t;
        expect(v.earned).toBe(false);
      }
    }
    // …maar wie nooit ademt, valt door de mand zodra de 4 minuten vol zijn
    expect(flaggedAt).toBeGreaterThanOrEqual(240_000);
    expect(flaggedAt).toBeLessThan(241_000);
    expect(guard.robotic).toBe(true);
  });

  it('an honest spammer who pauses to breathe is never endurance-flagged', () => {
    // 20 minuten lang hard klikken (~6/s, 20% jitter), maar elke ~90 s een
    // adempauze van 2,5 s — upgrades checken, scrollen, mens zijn
    const guard = new ClickGuard();
    let t = 0;
    let sinceBreak = 0;
    for (let i = 0; i < 7000 && t < 1_200_000; i++) {
      t += 160 + ((i * 37) % 60);
      sinceBreak += 1;
      if (sinceBreak >= 500) {
        t += 2500;
        sinceBreak = 0;
      }
      expect(guard.record(t).robotic, `klik ${i} (t=${t}ms)`).toBe(false);
    }
  });

  it('slow continuous tapping is not endurance — the rate floor protects casual clickers', () => {
    // 10 minuten elke ~1,1 s een tik zonder pauze: traag genoeg om mens te zijn
    const guard = new ClickGuard();
    let t = 0;
    for (let i = 0; i < 550; i++) {
      t += 1000 + ((i * 53) % 200);
      expect(guard.record(t).robotic, `klik ${i}`).toBe(false);
    }
  });
});
