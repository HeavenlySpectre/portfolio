import { describe, it, expect } from 'vitest';
import { scrambleFrame, formatCount } from '../../src/scripts/motion/fx';

const rand = () => 0.42;

describe('scrambleFrame', () => {
  const final = 'Hasta El Final.';
  for (const p of [0, 0.3, 0.7]) {
    it(`keeps length, spaces and punctuation at progress ${p}`, () => {
      const s = scrambleFrame(final, p, rand);
      expect(s).toHaveLength(15);
      expect(s[5]).toBe(' ');
      expect(s[8]).toBe(' ');
      expect(s[14]).toBe('.');
    });
  }
  it('equals the final text at progress 1', () => {
    expect(scrambleFrame(final, 1, rand)).toBe(final);
  });
});

describe('formatCount', () => {
  it('keeps the decimal count', () => {
    const s = formatCount('0.13689', 0.5);
    expect(s.split('.')[1]).toHaveLength(5);
  });
  it('lands exactly on the target with prefix and suffix', () => {
    expect(formatCount('800+', 1)).toBe('800+');
    expect(formatCount('>100%', 1)).toBe('>100%');
    expect(formatCount('99.70%', 1)).toBe('99.70%');
  });
  it('keeps prefix and suffix while counting', () => {
    expect(formatCount('>100%', 0.5)).toBe('>50%');
  });
});
