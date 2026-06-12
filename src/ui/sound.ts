export type SoundName = 'click' | 'buy' | 'prestige' | 'raid';

const MUSIC_VOL_KEY = 'ag.musicVol';
const SFX_VOL_KEY = 'ag.sfxVol';
const LEGACY_MUTE_KEY = 'ag.muted';
// hoorbaar maximum van de muziek; 100% op de slider = de oude vaste 0.25
const MUSIC_CEILING = 0.25;

let music: HTMLAudioElement | null = null;

function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      // migratie: wie vroeger op mute stond, start met alles op 0
      return localStorage.getItem(LEGACY_MUTE_KEY) === '1' ? 0 : fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : fallback;
  } catch {
    return fallback;
  }
}

let musicVol = readVolume(MUSIC_VOL_KEY, 100);
let sfxVol = readVolume(SFX_VOL_KEY, 100);
// onthouden wat er stond vóór de snelle mute, zodat die omkeerbaar is
let volumesBeforeSilence: { music: number; sfx: number } = { music: 100, sfx: 100 };

function persist(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // persistentie is best-effort
  }
}

export function getMusicVolume(): number {
  return musicVol;
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function setMusicVolume(value: number): void {
  musicVol = Math.min(Math.max(Math.round(value), 0), 100);
  persist(MUSIC_VOL_KEY, musicVol);
  if (music !== null) music.volume = MUSIC_CEILING * (musicVol / 100);
}

export function setSfxVolume(value: number): void {
  sfxVol = Math.min(Math.max(Math.round(value), 0), 100);
  persist(SFX_VOL_KEY, sfxVol);
}

export function isSilent(): boolean {
  return musicVol === 0 && sfxVol === 0;
}

/** Snelle mute-knop: alles naar 0, of terug naar de stand van daarvoor. */
export function toggleSilence(): boolean {
  if (isSilent()) {
    setMusicVolume(volumesBeforeSilence.music);
    setSfxVolume(volumesBeforeSilence.sfx);
  } else {
    volumesBeforeSilence = { music: musicVol, sfx: sfxVol };
    setMusicVolume(0);
    setSfxVolume(0);
  }
  return isSilent();
}

const SFX_VOLUME: Record<SoundName, number> = { click: 0.5, buy: 0.5, prestige: 0.8, raid: 0.7 };
const SFX_NAMES: readonly SoundName[] = ['click', 'buy', 'prestige', 'raid'];

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
  if (sfxVol === 0) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const play = (buffer: AudioBuffer): void => {
      if (ctx === null) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = SFX_VOLUME[name] * (sfxVol / 100);
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
    music.volume = MUSIC_CEILING * (musicVol / 100);
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
