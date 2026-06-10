const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value < 100) return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  if (value < 1000) return Math.floor(value).toString();
  const tier = Math.min(Math.floor(Math.log10(value) / 3), SUFFIXES.length - 1);
  const scaled = value / Math.pow(10, tier * 3);
  const digits = scaled >= 100 ? 0 : 1;
  return `${scaled.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
