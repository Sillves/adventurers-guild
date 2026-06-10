export type SoundName = 'click' | 'buy' | 'prestige';

const MUTE_KEY = 'ag.muted';
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
let music: HTMLAudioElement | null = null;
let muted = false;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // persistentie van mute is best-effort
  }
  if (music !== null) music.muted = muted;
  return muted;
}

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    let audio = cache[name];
    if (audio === undefined) {
      audio = new Audio(`audio/${name}.ogg`);
      audio.volume = 0.5;
      cache[name] = audio;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // audiobestand ontbreekt of autoplay geweigerd — stil doorgaan
  }
}

export function startMusic(): void {
  if (music !== null) return;
  try {
    music = new Audio('audio/music.ogg');
    music.loop = true;
    music.volume = 0.25;
    music.muted = muted;
    void music.play().catch(() => {
      music = null; // autoplay geweigerd — volgende interactie probeert opnieuw
    });
  } catch {
    music = null;
  }
}
