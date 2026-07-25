import { describe, it, expect } from 'vitest';
import { safeNext } from '../safeNext';

describe('safeNext', () => {
  it('passes plain same-origin relative paths', () => {
    expect(safeNext('/explore')).toBe('/explore');
    expect(safeNext('/explore/abc?menuPage=2')).toBe('/explore/abc?menuPage=2');
  });

  it('rejects empty/absent values', () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext('')).toBeNull();
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeNext('https://evil.com')).toBeNull();
    expect(safeNext('//evil.com')).toBeNull();
  });

  it('rejects backslash variants that URL-normalize to protocol-relative', () => {
    expect(safeNext('/\\evil.com')).toBeNull();
    expect(safeNext('\\\\evil.com')).toBeNull();
  });

  it('rejects control characters the URL parser strips (tab/CR/LF smuggling)', () => {
    expect(safeNext('/\t/evil.com')).toBeNull();
    expect(safeNext('/\n/evil.com')).toBeNull();
    expect(safeNext('/\r/evil.com')).toBeNull();
    expect(safeNext('/\x00evil')).toBeNull();
  });
});
