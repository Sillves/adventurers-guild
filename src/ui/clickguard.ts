// Autoclicker-verdediging voor de quest-knop. Drie lagen, allemaal UI-niveau
// (de engine blijft puur en de leaderboard-envelope heeft zijn eigen check):
//   1. untrusted events weren gebeurt in de handler (e.isTrusted);
//   2. een harde cap: meer dan 15 kliks/s verdient niets — sneller dan het
//      menselijke wereldrecord, dus eerlijke spelers merken er nooit iets van;
//   3. ritmedetectie: metronoom-timing of 20+ kliks op exact dezelfde pixel
//      is geen vinger. Zolang dat patroon loopt, negeert de guild de kliks.

const WINDOW_SIZE = 30;
const RATE_CAP_PER_SECOND = 15;
const RHYTHM_SAMPLE = 20;
// menselijke kliks jitteren ~10-30%; onder de 4% variatie zit een machine
const ROBOTIC_MAX_CV = 0.04;
const ROBOTIC_MAX_INTERVAL_MS = 400;
export const ROBOTIC_LABEL_MS = 4000;

interface ClickSample {
  readonly t: number;
  readonly x: number | null;
  readonly y: number | null;
}

export interface ClickVerdict {
  /** Telt deze klik mee voor goud/combo? */
  readonly earned: boolean;
  /** Oogt het patroon op dit moment robotisch? (toon de 🤖-banner) */
  readonly robotic: boolean;
}

export class ClickGuard {
  private samples: ClickSample[] = [];
  private roboticUntil = 0;

  record(t: number, x: number | null = null, y: number | null = null): ClickVerdict {
    this.samples.push({ t, x, y });
    if (this.samples.length > WINDOW_SIZE) this.samples.shift();

    if (this.looksRobotic(t)) this.roboticUntil = t + ROBOTIC_LABEL_MS;
    const robotic = t < this.roboticUntil;

    const inLastSecond = this.samples.filter((s) => s.t > t - 1000).length;
    const earned = !robotic && inLastSecond <= RATE_CAP_PER_SECOND;
    return { earned, robotic };
  }

  get robotic(): boolean {
    return this.samples.length > 0 && this.samples[this.samples.length - 1].t < this.roboticUntil;
  }

  private looksRobotic(now: number): boolean {
    if (this.samples.length < RHYTHM_SAMPLE) return false;
    const recent = this.samples.slice(-RHYTHM_SAMPLE);
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) intervals.push(recent[i].t - recent[i - 1].t);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean <= 0 || mean > ROBOTIC_MAX_INTERVAL_MS) return false;

    // metronoom: vrijwel identieke intervallen
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    if (Math.sqrt(variance) / mean < ROBOTIC_MAX_CV) return true;

    // pixel-perfect: 20 kliks op exact hetzelfde punt doet geen mens
    const first = recent[0];
    if (first.x === null || first.y === null) return false;
    return recent.every((s) => s.x === first.x && s.y === first.y);
  }
}
