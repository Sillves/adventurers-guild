// Autoclicker-verdediging voor de quest-knop. Drie lagen, allemaal UI-niveau
// (de engine blijft puur en de leaderboard-envelope heeft zijn eigen check):
//   1. untrusted events weren gebeurt in de handler (e.isTrusted);
//   2. een harde cap: meer dan 15 kliks/s verdient niets — sneller dan het
//      menselijke wereldrecord, dus eerlijke spelers merken er nooit iets van;
//   3. ritmedetectie: metronoom-timing is geen vinger. Mensen jitteren 10-30%
//      tussen kliks (op topsnelheid nog altijd ~5-8%); bots zitten op ~0%.
//
// Bewust GEEN pixel-regel meer: een muis geparkeerd op de knop en een duim
// verankerd op een telefoonscherm klikken allebei eerlijk pixel-perfect —
// vier testers (incl. Lorenz zelf) kregen daar onterecht de 🤖 voor.

const WINDOW_SIZE = 30;
const RATE_CAP_PER_SECOND = 15;
// Het volledige venster: bij 20 kliks was de CV-schatting zo ruizig dat een
// mens die lang genoeg spamt (raid + frenzy) vrijwel zeker één keer onder de
// drempel dook — Johan kreeg zo de 🤖 midden in zijn ×2-frenzy.
const RHYTHM_SAMPLE = WINDOW_SIZE;
// op topsnelheid jittert een mens nog ~5-8%; autoclickers (ook setInterval
// met event-loop-ruis) zitten op 0-1,5%. De 2% laat geen eerlijke vinger door.
const ROBOTIC_MAX_CV = 0.02;
const ROBOTIC_MAX_INTERVAL_MS = 400;
export const ROBOTIC_LABEL_MS = 4000;

export interface ClickVerdict {
  /** Telt deze klik mee voor goud/combo? */
  readonly earned: boolean;
  /** Oogt het patroon op dit moment robotisch? (toon de 🤖-banner) */
  readonly robotic: boolean;
}

export class ClickGuard {
  private times: number[] = [];
  private roboticUntil = 0;

  record(t: number): ClickVerdict {
    this.times.push(t);
    if (this.times.length > WINDOW_SIZE) this.times.shift();

    if (this.looksRobotic()) this.roboticUntil = t + ROBOTIC_LABEL_MS;
    const robotic = t < this.roboticUntil;

    const inLastSecond = this.times.filter((s) => s > t - 1000).length;
    const earned = !robotic && inLastSecond <= RATE_CAP_PER_SECOND;
    return { earned, robotic };
  }

  get robotic(): boolean {
    return this.times.length > 0 && this.times[this.times.length - 1] < this.roboticUntil;
  }

  private looksRobotic(): boolean {
    if (this.times.length < RHYTHM_SAMPLE) return false;
    const recent = this.times.slice(-RHYTHM_SAMPLE);
    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) intervals.push(recent[i] - recent[i - 1]);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean <= 0 || mean > ROBOTIC_MAX_INTERVAL_MS) return false;
    const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
    return Math.sqrt(variance) / mean < ROBOTIC_MAX_CV;
  }
}
