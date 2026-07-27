/**
 * The guard that stands between an owner-supplied link and an `href`.
 *
 * `z.url()` accepts `javascript:alert(1)` (it is a syntactically valid URL),
 * so without this the public shop page would render owner-authored stored XSS.
 * These cases are the attack surface, not decoration.
 */

import { describe, it, expect } from 'vitest';
import {
  displayUrlLabel,
  safeExternalUrl,
  safeTelHref,
} from '@/lib/utils/safeExternalUrl';
import { updateBusinessSettingsSchema } from '@/lib/validation/settings';

describe('safeExternalUrl — rejects', () => {
  const dangerous = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    // The WHATWG parser strips tab/CR/LF BEFORE parsing, so this becomes
    // `javascript:` — a naive startsWith check would wave it through.
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    // Protocol-relative: no scheme of its own, inherits the page's.
    '//evil.com',
    '//evil.com/path',
    // Relative / bare host — we decline rather than guess a scheme.
    '/relative/path',
    'facebook.com/shop',
    'http://',
    '',
    '   ',
  ];

  it.each(dangerous)('rejects %j', (input) => {
    expect(safeExternalUrl(input)).toBeNull();
  });

  it('rejects null and undefined', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it('rejects non-string JSONB values instead of throwing', () => {
    // social_links is untyped JSONB: `{"facebook": 12}` reaching .trim() would
    // crash the server-rendered public shop page.
    for (const value of [12, true, {}, [], { href: 'x' }]) {
      expect(() => safeExternalUrl(value)).not.toThrow();
      expect(safeExternalUrl(value)).toBeNull();
    }
    expect(safeTelHref(12)).toBeNull();
    expect(displayUrlLabel({})).toBeNull();
  });
});

describe('safeExternalUrl — accepts', () => {
  it('accepts http and https', () => {
    expect(safeExternalUrl('https://ilokal.shop')).toBe('https://ilokal.shop/');
    expect(safeExternalUrl('http://example.com/path')).toBe(
      'http://example.com/path',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(safeExternalUrl('  https://ilokal.shop  ')).toBe(
      'https://ilokal.shop/',
    );
  });

  it('keeps query strings and fragments', () => {
    expect(safeExternalUrl('https://x.com/shop?ref=a#top')).toBe(
      'https://x.com/shop?ref=a#top',
    );
  });
});

describe('displayUrlLabel', () => {
  it('shows the bare host', () => {
    expect(displayUrlLabel('https://www.ilokal.shop/menu')).toBe('ilokal.shop');
    expect(displayUrlLabel('https://shop.example.com')).toBe(
      'shop.example.com',
    );
  });

  it('is null for anything the guard rejects', () => {
    expect(displayUrlLabel('javascript:alert(1)')).toBeNull();
    expect(displayUrlLabel(null)).toBeNull();
  });
});

describe('safeTelHref', () => {
  it('builds a tel: href from formatted input', () => {
    expect(safeTelHref('(033) 320-1234')).toBe('tel:0333201234');
    expect(safeTelHref('+63 917 123 4567')).toBe('tel:+639171234567');
  });

  it('rejects too-short, too-long, and non-numeric input', () => {
    expect(safeTelHref('12345')).toBeNull();
    expect(safeTelHref('1234567890123456')).toBeNull();
    expect(safeTelHref('call us!')).toBeNull();
    expect(safeTelHref('+')).toBeNull();
    expect(safeTelHref('')).toBeNull();
    expect(safeTelHref(null)).toBeNull();
  });

  it('strips anything that could break out of the href', () => {
    // Free-text column: a quote or angle bracket must never survive.
    expect(safeTelHref('033"><script>x</script>3201234')).toBe(
      'tel:0333201234',
    );
  });
});

describe('updateBusinessSettingsSchema — link scheme allowlist', () => {
  const base = { social_links: { facebook: '', instagram: '', tiktok: '' } };

  it('rejects a javascript: website', () => {
    const result = updateBusinessSettingsSchema.safeParse({
      ...base,
      contact_website: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a javascript: social link', () => {
    const result = updateBusinessSettingsSchema.safeParse({
      social_links: {
        facebook: 'javascript:alert(1)',
        instagram: '',
        tiktok: '',
        website: '',
      },
    });
    expect(result.success).toBe(false);
  });

  it('still accepts http(s) links and empty values', () => {
    expect(
      updateBusinessSettingsSchema.safeParse({
        ...base,
        contact_website: 'https://ilokal.shop',
      }).success,
    ).toBe(true);
    expect(
      updateBusinessSettingsSchema.safeParse({ ...base, contact_website: '' })
        .success,
    ).toBe(true);
  });
});
