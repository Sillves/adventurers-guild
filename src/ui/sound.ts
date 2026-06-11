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

const SFX_VOLUME: Record<SoundName, number> = { click: 0.5, buy: 0.5, prestige: 0.8 };

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    let audio = cache[name];
    if (audio === undefined) {
      audio = new Audio(`audio/${name}.wav`);
      audio.volume = SFX_VOLUME[name];
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
    music = new Audio('audio/music.mp3');
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

// Muziek hoort niet door te spelen als de speler naar een andere app/tab gaat.
let resumeOnReturn = false;

function handleVisibilityChange(): void {
  if (music === null) return;
  if (document.hidden) {
    resumeOnReturn = !music.paused;
    music.pause();
  } else if (resumeOnReturn) {
    void music.play().catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}
