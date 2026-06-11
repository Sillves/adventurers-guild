// Scherm wakker houden via de Screen Wake Lock API — opt-in, net als mute.
// De browser laat de lock los zodra de tab verborgen wordt; bij terugkeren
// vragen we hem opnieuw aan.

const KEY = 'ag.keepAwake';
let enabled = false;
let sentinel: WakeLockSentinel | null = null;

export const wakeLockSupported =
  typeof navigator !== 'undefined' && 'wakeLock' in navigator;

try {
  enabled = localStorage.getItem(KEY) === '1';
} catch {
  enabled = false;
}

export function isKeepAwake(): boolean {
  return enabled;
}

async function acquire(): Promise<void> {
  if (!wakeLockSupported || !enabled || document.hidden || sentinel !== null) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    // geweigerd (bv. batterijbesparing) — stil doorgaan, scherm dimt gewoon
    sentinel = null;
  }
}

function release(): void {
  void sentinel?.release();
  sentinel = null;
}

export function toggleKeepAwake(): boolean {
  enabled = !enabled;
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    // persistentie is best-effort
  }
  if (enabled) void acquire();
  else release();
  return enabled;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void acquire();
  });
  void acquire();
}
