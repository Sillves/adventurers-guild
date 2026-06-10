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

  it('keeps one decimal under 100', () => {
    expect(formatNumber(12.34)).toBe('12.3');
  });

  it('uses suffixes with one decimal', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000_000)).toBe('2.5B');
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
