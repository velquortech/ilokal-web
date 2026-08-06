import { describe, it, expect } from 'vitest';
import { initialsFromName } from '@/lib/utils/initials';

describe('initialsFromName', () => {
  it('takes the first and last word', () => {
    // The surname carries more identity than a middle word, so "Seed Business
    // Owner" is SO, not SB.
    expect(initialsFromName('Seed Business Owner')).toBe('SO');
    expect(initialsFromName('Ana Cruz')).toBe('AC');
  });

  it('handles a single word', () => {
    expect(initialsFromName('Batchoy')).toBe('B');
  });

  it('survives the whitespace a real form produces', () => {
    // The previous per-file copy split on a single space, so a leading space
    // made the first "word" empty and the initials came out short.
    expect(initialsFromName('  Ana   Cruz  ')).toBe('AC');
    expect(initialsFromName('\tAna\nCruz')).toBe('AC');
  });

  it('does not split an astral character in half', () => {
    // `name[0]` returns half a surrogate pair, which renders as a replacement
    // glyph.
    expect(initialsFromName('🌸 Blooms')).toBe('🌸B');
  });

  it('returns the fallback for nothing usable', () => {
    expect(initialsFromName(undefined, 'AD')).toBe('AD');
    expect(initialsFromName(null, 'AD')).toBe('AD');
    expect(initialsFromName('   ', 'AD')).toBe('AD');
  });

  it('defaults to blank rather than guessing', () => {
    // An empty circle reads as "no picture"; stray letters read as someone
    // else's account — which is what shadcn's placeholder "CN" was doing.
    expect(initialsFromName(undefined)).toBe('');
    expect(initialsFromName('')).toBe('');
  });
});
