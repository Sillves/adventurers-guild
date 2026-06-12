import { describe, expect, it } from 'vitest';
import { ClickGuard } from './clickguard';

/** Menselijke kliks: ~6/s met 20% jitter en een zwabberende cursor. */
function humanClicks(guard: ClickGuard, count: number, startT = 0): boolean[] {
  const earned: boolean[] = [];
  let t = startT;
  for (let i = 0; i < count; i++) {
    // deterministische pseudo-jitter, ruim boven de 4%-drempel
    t += 160 + ((i * 37) % 60);
    earned.push(guard.record(t, 200 + (i % 7), 300 + ((i * 3) % 5)).earned);
  }
  return earned;
}

describe('ClickGuard', () => {
  it('lets human-paced jittery clicking through untouched', () => {
    const guard = new ClickGuard();
    expect(humanClicks(guard, 40).every(Boolean)).toBe(true);
    expect(guard.robotic).toBe(false);
  });

  it('caps earnings above 15 clicks per second', () => {
    const guard = new ClickGuard();
    const earned: boolean[] = [];
    // 25 kliks in één seconde, met jitter (geen metronoom) en bewegende cursor
    let t = 0;
    for (let i = 0; i < 25; i++) {
      t += 35 + ((i * 13) % 14);
      earned.push(guard.record(t, 200 + i, 300 - i).earned);
    }
    expect(earned.slice(0, 15).every(Boolean)).toBe(true);
    expect(earned.slice(15).some(Boolean)).toBe(false);
  });

  it('flags metronome timing as robotic and stops paying', () => {
    const guard = new ClickGuard();
    let verdictRobotic = false;
    let lastEarned = true;
    for (let i = 1; i <= 25; i++) {
      const v = guard.record(i * 200, 100 + i, 100); // perfect 200ms-ritme, cursor beweegt
      verdictRobotic = v.robotic;
      lastEarned = v.earned;
    }
    expect(verdictRobotic).toBe(true);
    expect(lastEarned).toBe(false);
  });

  it('flags 20+ pixel-perfect clicks even with human timing', () => {
    const guard = new ClickGuard();
    let robotic = false;
    let t = 0;
    for (let i = 0; i < 25; i++) {
      t += 160 + ((i * 37) % 60); // menselijke jitter…
      robotic = guard.record(t, 250, 350).robotic; // …maar exact dezelfde pixel
    }
    expect(robotic).toBe(true);
  });

  it('keyboard clicks (no coordinates) never trip the pixel rule', () => {
    const guard = new ClickGuard();
    let robotic = false;
    let t = 0;
    for (let i = 0; i < 25; i++) {
      t += 160 + ((i * 37) % 60);
      robotic = guard.record(t).robotic;
    }
    expect(robotic).toBe(false);
  });

  it('the robotic label expires once the pattern stops', () => {
    const guard = new ClickGuard();
    for (let i = 1; i <= 25; i++) guard.record(i * 100, 250, 350);
    expect(guard.robotic).toBe(true);
    // 5 s later, één eerlijke klik: label is verlopen en de klik telt weer
    const v = guard.record(25 * 100 + 5000, 260, 340);
    expect(v.robotic).toBe(false);
    expect(v.earned).toBe(true);
  });
});
