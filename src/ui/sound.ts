export type SoundName = 'click' | 'buy' | 'prestige';

const MUTE_KEY = 'ag.muted';
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
const SFX_NAMES: readonly SoundName[] = ['click', 'buy', 'prestige'];

// SFX via Web Audio: een enkel <audio>-element kan niet snel genoeg herstarten,
// waardoor bij snel tikken de meeste kliks geluidloos bleven.
let ctx: AudioContext | null = null;
const sfxData: Partial<Record<SoundName, Promise<ArrayBuffer>>> = {};
const sfxBuffers: Partial<Record<SoundName, AudioBuffer>> = {};

function fetchSfx(name: SoundName): Promise<ArrayBuffer> {
  return (sfxData[name] ??= fetch(`audio/${name}.wav`).then((r) => r.arrayBuffer()));
}

if (typeof document !== 'undefined') {
  for (const name of SFX_NAMES) void fetchSfx(name).catch(() => {});
}

export function playSound(name: SoundName): void {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const play = (buffer: AudioBuffer): void => {
      if (ctx === null) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = SFX_VOLUME[name];
      source.connect(gain).connect(ctx.destination);
      source.start();
    };
    const cached = sfxBuffers[name];
    if (cached !== undefined) {
      play(cached);
      return;
    }
    void fetchSfx(name)
      // decodeAudioData consumeert de buffer; slice houdt de cache bruikbaar
      .then((data) => ctx?.decodeAudioData(data.slice(0)))
      .then((buffer) => {
        if (buffer === undefined) return;
        sfxBuffers[name] = buffer;
        play(buffer);
      })
      .catch(() => {});
  } catch {
    // audiobestand ontbreekt of geen Web Audio-ondersteuning — stil doorgaan
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
