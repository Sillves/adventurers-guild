import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber } from './format';

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
