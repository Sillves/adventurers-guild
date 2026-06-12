import { describe, expect, it } from 'vitest';
import { formatDuration, formatEta, formatNumber } from './format';

describe('formatNumber', () => {
  it('shows small integers plainly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('floors small non-integers above 100', () => {
    expect(formatNumber(123.7)).toBe('123');
  });

  it('keeps one decimal under 100, truncated', () => {
    expect(formatNumber(12.34)).toBe('12.3');
    expect(formatNumber(99.97)).toBe('99.9');
  });

  it('shows exact grouped integers below 100K', () => {
    expect(formatNumber(1151)).toBe('1,151');
    expect(formatNumber(12_000)).toBe('12,000');
    expect(formatNumber(99_999)).toBe('99,999');
  });

  it('uses suffixes with one decimal from 100K', () => {
    expect(formatNumber(150_000)).toBe('150K');
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000_000)).toBe('2.5B');
  });

  it('truncates instead of rounding so the display never overstates', () => {
    expect(formatNumber(1_199_999)).toBe('1.1M'); // afronden zou 1.2M tonen
    expect(formatNumber(999_999)).toBe('999K');
  });

  it('drops the decimal at three significant digits', () => {
    expect(formatNumber(123_456_789)).toBe('123M');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(150)).toBe('2m 30s');
    expect(formatDuration(8 * 3600)).toBe('8h 0m');
  });
});

describe('formatEta', () => {
  it('uses seconds/minutes/hours for short waits', () => {
    expect(formatEta(45)).toBe('45s');
    expect(formatEta(150)).toBe('2m 30s');
    expect(formatEta(7300)).toBe('2h 1m');
  });

  it('uses days below a year', () => {
    expect(formatEta(3 * 86400 + 5 * 3600)).toBe('3d 5h');
    expect(formatEta(364 * 86400)).toBe('364d 0h');
  });

  it('uses years for absurd horizons, Sam-style', () => {
    expect(formatEta(2 * 365 * 86400)).toBe('2.0 years');
    // het getal uit de groepschat moet er letterlijk uit kunnen rollen
    expect(formatEta(21_480 * 365 * 86400)).toBe('21,480 years');
  });

  it('handles broken input gracefully', () => {
    expect(formatEta(Infinity)).toBe('∞');
    expect(formatEta(-5)).toBe('∞');
  });
});
