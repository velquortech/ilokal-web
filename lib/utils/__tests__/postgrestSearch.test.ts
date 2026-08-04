/**
 * PostgREST search escaping.
 *
 * `.or()` takes a filter STRING, not parameters, so a raw user term is not
 * "unsanitised input" in the injection-into-SQL sense — it is input that
 * rewrites the *filter grammar*. A comma ends a condition, a parenthesis
 * groups one, and `%`/`_` are `ilike` wildcards. All four are ordinary
 * characters to type into a search box.
 */

import { describe, it, expect } from 'vitest';
import { ilikePattern } from '../postgrestSearch';

describe('ilikePattern', () => {
  it('wraps the term in quotes so a comma cannot end the condition', () => {
    // "Iznart St., Iloilo" is an entirely reasonable thing to search for, and
    // unquoted it turned one condition into two.
    expect(ilikePattern('Iznart St., Iloilo')).toBe('"%Iznart St., Iloilo%"');
  });

  it('leaves a parenthesis inert', () => {
    expect(ilikePattern('Kape (Molo)')).toBe('"%Kape (Molo)%"');
  });

  it('escapes the ilike wildcards', () => {
    // Unescaped, `%` turns a search into a scan and `_` matches any character.
    expect(ilikePattern('100%')).toBe('"%100\\%%"');
    expect(ilikePattern('a_b')).toBe('"%a\\_b%"');
  });

  it('escapes the quoting characters', () => {
    expect(ilikePattern('say "hi"')).toBe('"%say \\"hi\\"%"');
    expect(ilikePattern("it's")).toBe('"%it\'\'s%"');
  });

  it('escapes backslashes first, so nothing is double-escaped', () => {
    // If `\` were escaped last it would re-escape the backslashes added for
    // `%`, `_` and `"`, and the pattern would stop matching.
    expect(ilikePattern('a\\b')).toBe('"%a\\\\b%"');
    expect(ilikePattern('50%\\')).toBe('"%50\\%\\\\%"');
  });

  it('handles an empty term without producing a broken pattern', () => {
    expect(ilikePattern('')).toBe('"%%"');
  });
});
