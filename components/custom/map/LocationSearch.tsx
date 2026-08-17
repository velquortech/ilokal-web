'use client';

/**
 * "Type a place name instead of panning and tapping."
 *
 * A debounced search box over the map: the input sits ABOVE the map so a
 * phone keyboard does not cover it, and the results drop down over the tiles
 * (the map's box never resizes, so leaflet never has to re-measure).
 *
 * Picking a result hands the coordinates to the parent through the same
 * `onSelect` the map's tap handler uses — the pin lands and the map centers
 * on it, exactly as if the user had tapped there.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { geocodePlace, type GeocodeResult } from '@/lib/utils/geocode';

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 5;

interface LocationSearchProps {
  onSelect: (latitude: number, longitude: number) => void;
}

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  // The place the user picked, shown in the input until they type again.
  const [chosen, setChosen] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      controllerRef.current?.abort();
      setResults([]);
      setError(null);
      setOpen(false);
      setSearching(false);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const found = await geocodePlace(trimmed, controller.signal);
        setResults(found.slice(0, MAX_RESULTS));
        setError(null);
        setActiveIndex(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setResults([]);
        setError("Couldn't search for that place.");
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const pick = (result: GeocodeResult) => {
    onSelect(result.latitude, result.longitude);
    setChosen(result.name);
    setQuery('');
    setOpen(false);
    setError(null);
    inputRef.current?.blur();
  };

  const clear = () => {
    controllerRef.current?.abort();
    setChosen(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[activeIndex >= 0 ? activeIndex : 0];
      if (result) pick(result);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative z-[1000]">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="location-search-results"
          aria-label="Search for a place to pin"
          placeholder="Search for a place…"
          autoComplete="off"
          value={chosen ?? query}
          onChange={(e) => {
            setChosen(null);
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0 || error) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="pr-8 pl-8"
        />
        {(searching || chosen !== null || query !== '') && (
          <span className="absolute top-1/2 right-2 -translate-y-1/2">
            {searching ? (
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            ) : (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground rounded p-0.5"
              >
                <X className="size-4" />
              </button>
            )}
          </span>
        )}
      </div>

      {open && (
        <ul
          id="location-search-results"
          role="listbox"
          className="bg-background border-border absolute inset-x-0 top-full z-[1000] mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg"
        >
          {results.length > 0 ? (
            results.map((result, index) => (
              <li key={`${result.latitude},${result.longitude}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(result)}
                  className={`hover:bg-accent w-full px-3 py-2 text-left text-sm ${
                    index === activeIndex ? 'bg-accent' : ''
                  }`}
                >
                  {result.name}
                </button>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {error ?? 'No places found'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
