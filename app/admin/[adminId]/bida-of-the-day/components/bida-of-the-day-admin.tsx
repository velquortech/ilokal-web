'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  deleteBidaPickAction,
  listBidaPicksAction,
  searchBidaProductsAction,
  upsertBidaPickAction,
} from '../../actions/bidaOfTheDayActions';
import type {
  BidaPick,
  BidaProductResult,
} from '@/lib/api/admin/bidaOfTheDayQuery';

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BidaOfTheDayAdmin({
  initialPicks,
}: {
  initialPicks: BidaPick[];
}) {
  const [picks, setPicks] = useState<BidaPick[]>(initialPicks);
  const [today] = useState(() => toLocalDateString(new Date()));

  // Form state.
  const [pickDate, setPickDate] = useState(today);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<BidaProductResult | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BidaProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPicks = useCallback(async () => {
    const res = await listBidaPicksAction();
    if (res.success && res.data?.picks) {
      setPicks(res.data.picks);
    }
  }, []);

  // Debounced product search (product name OR business name).
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await searchBidaProductsAction(q);
      setSearching(false);
      if (res.success && res.data?.products) {
        setResults(res.data.products);
      } else {
        setResults([]);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const handleSave = async () => {
    setError(null);
    setFlash(null);
    if (!selected) {
      setError('Choose a product first (search by product or business name).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickDate)) {
      setError('Pick a valid date.');
      return;
    }
    setSaving(true);
    const res = await upsertBidaPickAction({
      pick_date: pickDate,
      product_id: selected.product_id,
      note: note || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error?.message ?? 'Failed to save the pick.');
      return;
    }
    setFlash(
      `Pick for ${pickDate} saved — ${selected.product_name} / ${selected.business_name}.`,
    );
    setSelected(null);
    setQuery('');
    setResults([]);
    setNote('');
    await refreshPicks();
  };

  const handleRemove = async (date: string) => {
    if (!window.confirm(`Remove the Bida of the Day pick for ${date}?`)) return;
    setError(null);
    setRemoving(date);
    const res = await deleteBidaPickAction(date);
    setRemoving(null);
    if (!res.success) {
      setError(res.error?.message ?? 'Failed to remove the pick.');
      return;
    }
    setFlash(
      `Pick for ${date} removed — the board falls back to the rotation.`,
    );
    await refreshPicks();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Set a pick
          </CardTitle>
          <CardDescription>
            One pick per date — re-picking a date replaces its previous pick.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pick-date">Date</Label>
            <Input
              id="pick-date"
              type="date"
              value={pickDate}
              onChange={(e) => setPickDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Product</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                className="pl-8"
                placeholder="Search product or business name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {searching && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </p>
            )}
            {!searching && results.length > 0 && (
              <ul className="border-input mt-1 max-h-56 divide-y overflow-auto rounded-md border">
                {results.map((r) => (
                  <li key={r.product_id}>
                    <button
                      type="button"
                      className={`hover:bg-accent flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                        selected?.product_id === r.product_id ? 'bg-accent' : ''
                      }`}
                      onClick={() => {
                        setSelected(r);
                        setQuery('');
                        setResults([]);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {r.product_name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {r.business_name}
                          {r.price != null ? ` · ₱${r.price}` : ''}
                        </span>
                      </span>
                      {selected?.product_id === r.product_id && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p className="flex items-center gap-1.5 text-sm">
                <Badge variant="secondary">Selected</Badge>
                <span className="truncate">
                  {selected.product_name} · {selected.business_name}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pick-note">Note (optional)</Label>
            <Textarea
              id="pick-note"
              placeholder="Why this pick? Shown to the editorial team, not on the board."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-destructive flex items-center gap-1.5 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          {flash && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600">
              <Check className="h-4 w-4" /> {flash}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving || !selected}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save pick'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled picks</CardTitle>
          <CardDescription>
            Newest date first — {today} is today's live pick unless superseded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {picks.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No picks scheduled yet. The board is running the algorithmic
              rotation.
            </p>
          ) : (
            <ul className="divide-y">
              {picks.map((pick) => {
                const isToday = pick.pick_date === today;
                return (
                  <li
                    key={pick.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {pick.pick_date}
                        {isToday && <Badge>Live today</Badge>}
                      </p>
                      <p className="truncate text-sm">{pick.product_name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {pick.business_name}
                        {pick.note ? ` · ${pick.note}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove pick for ${pick.pick_date}`}
                      disabled={removing === pick.pick_date}
                      onClick={() => handleRemove(pick.pick_date)}
                    >
                      {removing === pick.pick_date ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="text-muted-foreground h-4 w-4" />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
