// Autoclicker-verdediging voor de quest-knop. Vier lagen, allemaal UI-niveau
// (de engine blijft puur en de leaderboard-envelope heeft zijn eigen check):
//   1. untrusted events weren gebeurt in de handler (e.isTrusted);
//   2. een harde cap: meer dan 15 kliks/s verdient niets — sneller dan het
//      menselijke wereldrecord, dus eerlijke spelers merken er nooit iets van;
//   3. ritmedetectie: metronoom-timing is geen vinger. Mensen jitteren 10-30%
//      tussen kliks (op topsnelheid nog altijd ~5-8%); bots zitten op ~0%;
//   4. uithouding: random jitter verslaat de ritmecheck, maar geen mens klikt
//      4+ minuten aan 4+/s zonder één adempauze van 2 s. Bots wel ("Random
//      noise, you will never catch me 😉" — Sam, 12 juni 2026).
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
// uithoudingsregel: een "reeks" breekt op elke pauze van 2 s. Wie 4 minuten
// lang gemiddeld 4+/s klikt zonder ooit zo'n pauze, is een machine — een
// frenzy duurt maar 60 s, dus eerlijk los gaan komt hier nooit in de buurt.
const ENDURANCE_BREAK_MS = 2000;
const ENDURANCE_MIN_SECONDS = 240;
const ENDURANCE_MIN_RATE = 4;

export interface ClickVerdict {
  /** Telt deze klik mee voor goud/combo? */
  readonly earned: boolean;
  /** Oogt het patroon op dit moment robotisch? (toon de 🤖-banner) */
  readonly robotic: boolean;
}

export class ClickGuard {
  private times: number[] = [];
  private roboticUntil = 0;
  private streakStart = -1;
  private streakClicks = 0;
  private lastClickAt = -1;

  record(t: number): ClickVerdict {
    this.times.push(t);
    if (this.times.length > WINDOW_SIZE) this.times.shift();

    if (this.lastClickAt < 0 || t - this.lastClickAt >= ENDURANCE_BREAK_MS) {
      this.streakStart = t;
      this.streakClicks = 0;
    }
    this.lastClickAt = t;
    this.streakClicks += 1;

    if (this.looksRobotic() || this.looksTireless(t)) this.roboticUntil = t + ROBOTIC_LABEL_MS;
    const robotic = t < this.roboticUntil;

    const inLastSecond = this.times.filter((s) => s > t - 1000).length;
    const earned = !robotic && inLastSecond <= RATE_CAP_PER_SECOND;
    return { earned, robotic };
  }

  get robotic(): boolean {
    return this.times.length > 0 && this.times[this.times.length - 1] < this.roboticUntil;
  }

  private looksTireless(t: number): boolean {
    const seconds = (t - this.streakStart) / 1000;
    return seconds >= ENDURANCE_MIN_SECONDS && this.streakClicks / seconds >= ENDURANCE_MIN_RATE;
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
