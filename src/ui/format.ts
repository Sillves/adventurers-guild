const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

// Overal afkappen, nooit afronden: het scherm mag nooit méér tonen dan je
// echt hebt, anders lijkt een betaalbare knop onverklaarbaar disabled
// (tester had "1.1K" op het scherm — 1.149 afgerond — en kon niets van 1.1K kopen).
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value < 100) {
    return Number.isInteger(value) ? value.toString() : (Math.floor(value * 10) / 10).toFixed(1);
  }
  // exact tot 100K: vroeg in het spel telt elke munt
  if (value < 100_000) return Math.floor(value).toLocaleString('en-US');
  const tier = Math.min(Math.floor(Math.log10(value) / 3), SUFFIXES.length - 1);
  const scaled = value / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : 1;
  const truncated = Math.floor(scaled * 10 ** digits) / 10 ** digits;
  return `${truncated.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
