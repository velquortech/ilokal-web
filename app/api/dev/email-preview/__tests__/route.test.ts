import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dev/email-preview/route';

function req(query = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/dev/email-preview${query}`);
}

afterEach(() => {
  // NODE_ENV is a read-only property on `process.env`, so use the stub env.
  vi.unstubAllEnvs();
});

function setNodeEnv(value: 'development' | 'production' | 'test') {
  vi.stubEnv('NODE_ENV', value);
}

describe('GET /api/dev/email-preview', () => {
  it('renders the reset template as HTML in development', async () => {
    setNodeEnv('development');
    const res = GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const body = await res.text();
    expect(body).toContain('Reset your password');
  });

  it('injects sample query params (name + url)', async () => {
    setNodeEnv('development');
    const res = GET(req('?name=Ian&url=https://x.test/r?token_hash=zzz'));
    const body = await res.text();
    expect(body).toContain('Hi Ian,');
    expect(body).toContain('token_hash=zzz');
  });

  it('404s in production so it never ships', async () => {
    setNodeEnv('production');
    const res = GET(req());
    expect(res.status).toBe(404);
  });

  it('400s on an unknown template', async () => {
    setNodeEnv('development');
    const res = GET(req('?template=nope'));
    expect(res.status).toBe(400);
  });

  it('renders the menu-followup template with its sample props', async () => {
    setNodeEnv('development');
    const res = GET(req('?template=menu-followup'));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('The Artisan Roastery');
    expect(body).toContain('/business/SAMPLE/product-catalogues');
  });

  it('threads the menu-followup query params (shop + noun)', async () => {
    setNodeEnv('development');
    const res = GET(
      req('?template=menu-followup&shop=Nena%20Salon&noun=service%20menu'),
    );
    const body = await res.text();
    expect(body).toContain('Nena Salon');
    // The noun flows into the heading, title-cased.
    expect(body).toContain('Service Menu');
  });
});
