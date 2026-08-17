import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodePlace } from '../geocode';

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
});

vi.stubGlobal('fetch', fetchMock);

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

describe('geocodePlace', () => {
  it('queries Nominatim with the search term and JSON format', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await geocodePlace('SM City Iloilo');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin + url.pathname).toBe(NOMINATIM);
    expect(url.searchParams.get('q')).toBe('SM City Iloilo');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('parses display_name / lat / lon into numbers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: 'Iloilo City Proper, Iloilo, Philippines',
          lat: '10.6969',
          lon: '122.5732',
        },
        { display_name: 'Broken row', lat: 'not-a-number', lon: '122.5' },
        { display_name: '', lat: '10.1', lon: '122.1' },
      ],
    });

    const results = await geocodePlace('Iloilo City Proper');

    expect(results).toEqual([
      {
        name: 'Iloilo City Proper, Iloilo, Philippines',
        latitude: 10.6969,
        longitude: 122.5732,
      },
    ]);
  });

  it('throws on a non-OK response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(geocodePlace('anywhere')).rejects.toThrow('503');
  });

  it('forwards the abort signal so stale lookups can be cancelled', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

    await geocodePlace('Iloilo', controller.signal);

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});
