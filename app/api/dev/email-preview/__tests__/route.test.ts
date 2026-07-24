import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dev/email-preview/route';

const ORIGINAL_ENV = process.env.NODE_ENV;

function req(query = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/dev/email-preview${query}`);
}

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

function setNodeEnv(value: 'development' | 'production' | 'test') {
  process.env.NODE_ENV = value;
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
});
