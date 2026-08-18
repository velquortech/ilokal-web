import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, ImageOff, List, LucideIcon, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useMultiStepForm } from '../provider/registration-form-provider';
import { useRecentCategories } from '../hooks/useRecentCategories';
import { logOwnerEvent } from '../actions/ownerEvents';
import type { BusinessCategory, BusinessType } from '../api/fetchCategories';

import { Field, FieldError } from '@/components/ui/field';
import { Controller } from 'react-hook-form';

type CategoryWithType = {
  item: BusinessCategory;
  type: BusinessType;
};

export function ShopCategoryStep() {
  const { form, businessTypes } = useMultiStepForm();
  const { recents, record } = useRecentCategories();
  const [selected, setSelected] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const category = form.watch('business_category');
  // Debounce the search funnel event so a typed phrase logs once, not once
  // per keystroke. Cleared on unmount so a step change never logs a stale
  // search the owner abandoned.
  const searchEventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.trim().toLowerCase();

  // Flatten once with each item's owner, so a pick can auto-fill the type
  // filter below without a second lookup per card.
  const allItems = businessTypes.flatMap((type) =>
    type.items.map((item) => ({ item, type })),
  );

  // Recents that still exist in the taxonomy — a category deleted by an admin
  // drops off the strip (and stops counting against the cap when re-picked).
  const recentItems = recents
    .map((r) => allItems.find(({ item }) => item.id === r.id))
    .filter((r): r is CategoryWithType => !!r);

  // Searching spans EVERY vertical, not just the filtered one: the whole
  // point is to rescue an owner who cannot find their category by browsing
  // the grid one type at a time. Results live in a dropdown — the grid below
  // stays on the filtered type and is untouched by a search.
  const results = normalizedQuery
    ? allItems.filter(
        ({ item }) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery),
      )
    : [];

  const showDropdown = open && normalizedQuery.length > 0;
  const activeResult = showDropdown ? results[activeIndex] : undefined;

  // Keep the highlighted row valid as the results shrink while typing.
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(results.length - 1, 0)));
  }, [results.length]);

  // Drop a pending search event when the step unmounts (owner moved on).
  useEffect(
    () => () => {
      if (searchEventTimer.current) clearTimeout(searchEventTimer.current);
    },
    [],
  );

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    setOpen(value.trim().length > 0);

    if (searchEventTimer.current) clearTimeout(searchEventTimer.current);
    searchEventTimer.current = setTimeout(() => {
      const q = value.trim();
      if (!q) return;
      // Whether the search found anything is the funnel's real question:
      // an owner who searches and finds nothing is a different problem from
      // one who never searches at all.
      void logOwnerEvent('reg_category_searched', {
        query: q,
        results: allItems.filter(
          ({ item }) =>
            item.name.toLowerCase().includes(q.toLowerCase()) ||
            item.description.toLowerCase().includes(q.toLowerCase()),
        ).length,
      });
    }, 600);
  };

  /**
   * Apply a category pick: fill the form, keep the type filter (and its chip)
   * in agreement with the pick's vertical, and remember it for the next
   * visit. `isSelected` toggles — clicking the already-picked card un-picks,
   * exactly as the grid always has.
   */
  const pickCategory = (result: CategoryWithType, isSelected: boolean) => {
    const { item, type } = result;
    form.setValue(
      'business_category',
      {
        id: isSelected ? undefined : item.id,
        type: 'predefined',
        name: isSelected ? '' : item.name,
        description: item.description,
      },
      { shouldValidate: true },
    );

    if (!isSelected) {
      // Auto-fill the type filter with the pick's owner — a category chosen
      // from a search result or the recents strip can belong to a vertical
      // the owner was not browsing, and the filter (and its chip) must agree
      // with the selection.
      setSelected(type.name);
      // Remember the pick so a returning owner finds it at the top of the
      // grid instead of hunting for it again.
      record(item.id, item.name);
    }
  };

  const selectResult = (result: CategoryWithType) => {
    pickCategory(result, false);
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      // The search box is not a form submit trigger.
      if (e.key === 'Enter') e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        results.length === 0 ? 0 : (prev + 1) % results.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        results.length === 0 ? 0 : (prev - 1 + results.length) % results.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) selectResult(result);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
      setActiveIndex(0);
    }
  };

  // The type whose filter is active — shown in the step header so a long
  // scroll through the grid never loses what the owner is looking at.
  const activeType =
    selected !== 'All' ? businessTypes.find((b) => b.name === selected) : null;

  // The grid is filtered only by the type select; a search never touches it.
  // Picked cards stay in the grid with their selected ring so a re-click
  // toggles them off — the recents strip is a quick-access shortcut, not
  // a way to hide cards from the catalog.
  const gridItems =
    selected !== 'All' && selected !== undefined
      ? allItems.filter(({ type }) => type.name === selected)
      : allItems;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* STICKY FILTER BAR — the search + type filter stay pinned while the
          grid scrolls, and the active-type chip rides along so the owner
          always knows which vertical they're browsing. Deliberately no
          "Custom" option: an owner-invented type has no vertical, so it falls
          back to the retail offering mode and breaks the type-scoped sorting
          and category scoping everywhere downstream. */}
      <div className="bg-background sticky top-0 z-10 space-y-2 pb-2">
        {activeType && (
          <div className="bg-primary/10 text-primary inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium">
            <activeType.icon className="size-3.5" />
            {activeType.name}
          </div>
        )}

        {/* SEARCH — a combobox that finds a category by name (or description)
            across every business type. Arrow keys move through the results,
            Enter picks the highlighted one, and picking auto-fills the type
            filter with the category's vertical. */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? 'category-search-results' : undefined}
            aria-activedescendant={
              activeResult
                ? `category-search-option-${activeResult.item.id}`
                : undefined
            }
            aria-autocomplete="list"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setOpen(query.trim().length > 0)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            placeholder="Search category name..."
            aria-label="Search categories"
            className="h-11 pr-9 pl-10"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setOpen(false);
                setActiveIndex(0);
                // Hand focus back to the input. This button renders only while
                // `query` is non-empty, so clearing UNMOUNTS the element that
                // currently holds focus — without this a keyboard user is
                // dropped to <body> and has to tab back in from the top.
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}

          {showDropdown && (
            <div
              id="category-search-results"
              role="listbox"
              aria-label="Matching categories across all business types"
              // Keep focus in the input so blur does not close the list
              // before a click on a result lands.
              onMouseDown={(e) => e.preventDefault()}
              className="bg-background border-border absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border shadow-lg"
            >
              <div className="text-muted-foreground border-border border-b px-3 py-2 text-xs">
                {results.length} {results.length === 1 ? 'match' : 'matches'}{' '}
                across all business types
              </div>
              {results.length === 0 ? (
                <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                  No categories match “{query.trim()}”.
                </div>
              ) : (
                results.map((result, idx) => {
                  const { item, type } = result;
                  const isActive = idx === activeIndex;
                  // Id-based, not name-based: several verticals share a
                  // category called "General", and a same-named result from
                  // another type must not show this one as picked.
                  const isPicked =
                    category?.type === 'predefined' && category.id === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`category-search-option-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => selectResult(result)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left',
                        isActive && 'bg-primary/10',
                      )}
                    >
                      <div className="bg-primary/10 text-primary! shrink-0 rounded p-1.5">
                        <type.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-muted-foreground/70 truncate text-xs">
                          {type.name}
                          {item.description ? ` — ${item.description}` : ''}
                        </p>
                      </div>
                      {isPicked && (
                        <Check className="text-primary size-4 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Select
          onValueChange={(value) => {
            setSelected(value);

            // Picking a filter never picks a category — it resets the
            // selection so the owner chooses from the filtered grid. It also
            // overrides any active search: the dropdown is driven by the
            // query, and the grid below by the filter.
            setQuery('');
            setOpen(false);
            form.setValue(
              'business_category',
              {
                type: 'predefined',
                name: '',
                description: '',
              },
              { shouldValidate: true },
            );
          }}
          value={selected}
        >
          <SelectTrigger className="flex h-16! w-full items-center truncate overflow-hidden text-start ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue placeholder="Select business type" />
          </SelectTrigger>

          <SelectContent position="popper">
            <SelectGroup className="space-y-2">
              <SelectLabel>Business Type</SelectLabel>

              <SelectItem value="All">
                <div className="bg-primary/10 text-primary! rounded p-2.5">
                  <List />
                </div>
                <div className="ml-4 flex flex-col">
                  <p className="font-medium">All Business Types</p>
                  <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                    Show every business type's categories
                  </p>
                </div>
              </SelectItem>

              {businessTypes.map((b) => (
                <SelectItem value={b.name} key={b.name}>
                  <div className="bg-primary/10 text-primary! rounded p-2.5">
                    <b.icon />
                  </div>
                  <div className="ml-4 flex flex-col">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-muted-foreground/50 min-w-0 flex-1 truncate overflow-hidden text-sm">
                      {b.description}
                    </p>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* CATEGORY GRID — the categories of the type selected above. A search
          never filters this grid; its results live in the dropdown. */}
      <Controller
        name="business_category"
        control={form.control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="mt-4 text-sm">
              {/* RECENTLY CHOSEN — a returning owner's last picks, above the
                  grid so they never scroll to find them again. Each chip is a
                  shortcut: picking one fills the form, jumps the type filter
                  to its vertical, and moves it to the front of the strip. */}
              {recentItems.length > 0 && (
                <div className="mb-4">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                    Recently chosen
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentItems.map(({ item, type }) => {
                      // Id-based, not name-based: several verticals share a
                      // category called "General", and a same-named chip from
                      // another type must not read as selected — or worse,
                      // turn a click into an un-pick instead of a switch.
                      const isSelected =
                        category?.type === 'predefined' &&
                        category.id === item.id;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            if (!isSelected) {
                              void logOwnerEvent('reg_recent_picked', {
                                category_id: item.id,
                                category_name: item.name,
                              });
                            }
                            pickCategory({ item, type }, isSelected);
                          }}
                          className={cn(
                            'border-border hover:border-primary bg-background inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors',
                            isSelected && 'border-primary text-primary',
                          )}
                        >
                          <type.icon className="size-3.5" />
                          {item.name}
                          {isSelected && <Check className="size-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                {gridItems.map(({ item, type }) => {
                  // Id-based, not name-based: the real taxonomy has a
                  // "General" category in every vertical — same name, different
                  // ids. A name-based check would mark every "General" card as
                  // selected and a click would toggle-off instead of switching.
                  const isSelected =
                    category?.type === 'predefined' && category.id === item.id;

                  return (
                    <CategoryCard
                      {...item}
                      key={item.id}
                      isSelected={isSelected}
                      hasSelected={
                        category?.type === 'predefined' && !!category?.id
                      }
                      onSelect={() => pickCategory({ item, type }, isSelected)}
                      type={{ name: type.name, icon: type.icon }}
                    />
                  );
                })}
              </div>
            </div>

            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}

function CategoryCard(item: {
  name: string;
  imageURL: string | null;
  description: string;
  isSelected?: boolean;
  onSelect: () => void;
  hasSelected?: boolean;
  type?: {
    name: string;
    icon: LucideIcon;
  };
}) {
  return (
    <div
      className={cn(
        'border-border hover:border-primary group relative h-max cursor-pointer overflow-hidden rounded-lg border p-1 shadow',
        item.isSelected && 'border-primary',
      )}
      onClick={item.onSelect}
    >
      {item.isSelected && (
        <div
          className={cn(
            'ring-primary absolute top-3 right-3 z-20 flex size-4 rounded-full bg-white ring-3',
          )}
        >
          <Check className="text-primary m-auto size-3" />
        </div>
      )}
      <div className="bg-muted border-border z-10 h-28 w-full overflow-hidden rounded-md border sm:h-52">
        {/* `image_url` is nullable and an admin can create a category without
            one. Passing a null OR an empty string to next/image throws and
            takes the whole registration step down with it, so the absence is
            handled here rather than pretended away upstream. The placeholder
            reuses the vertical's icon — the same language the search dropdown
            already uses — so a missing photo reads as a category without a
            picture, not as a broken tile. */}
        {item.imageURL ? (
          <Image
            alt={item.name}
            src={item.imageURL}
            width={1000}
            height={1000}
            className={cn(
              'transition-all duration-300 group-hover:scale-110',
              !item.isSelected &&
                item.hasSelected &&
                'grayscale hover:grayscale-0',
            )}
          />
        ) : (
          <div
            className="bg-primary/5 flex h-full w-full items-center justify-center"
            // Decorative: the card already names the category in text below,
            // so announcing the placeholder would just repeat it.
            aria-hidden
          >
            {item.type ? (
              <item.type.icon className="text-primary/40 size-8 sm:size-12" />
            ) : (
              <ImageOff className="text-muted-foreground/40 size-8 sm:size-12" />
            )}
          </div>
        )}
      </div>
      <div className="mt-2 min-h-16 p-2 pb-0">
        <p className="text-foreground text-sm font-medium sm:text-base">
          {item.name}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{item.description}</p>
      </div>
      {item.type && (
        <div className="text-muted-foreground/50 inline-flex items-center gap-2 p-2 pt-0">
          <item.type.icon className="size-3" />
          <span className="text-xs">{item.type.name}</span>
        </div>
      )}
    </div>
  );
}
