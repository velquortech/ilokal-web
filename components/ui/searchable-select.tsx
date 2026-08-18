'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SearchableSelectProps<T> {
  options: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Forwarded to the trigger button so a FieldLabel's htmlFor can target it. */
  id?: string;
}

/**
 * A searchable picker: a button trigger showing the chosen option, opening a
 * popover whose search box filters the list. The search box is keyboard
 * navigable — ↑/↓ move the highlight (wrapping), Enter picks it, Escape first
 * clears the query then closes. The pattern mirrors the registration wizard's
 * category search so picking never requires scrolling a long select.
 */
export function SearchableSelect<T>({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  getLabel,
  getValue,
  disabled = false,
  loading = false,
  emptyMessage = 'No results found.',
  className,
  id,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => getValue(opt) === value);
  const selectedLabel = selectedOption ? getLabel(selectedOption) : placeholder;

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      getLabel(option).toLowerCase().includes(q),
    );
  }, [options, query, getLabel]);

  // Keep the highlighted row valid as the list shrinks while typing.
  React.useEffect(() => {
    setActiveIndex((prev) =>
      Math.min(prev, Math.max(filteredOptions.length - 1, 0)),
    );
  }, [filteredOptions.length]);

  // Keep the highlighted row visible while it moves.
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, filteredOptions.length]);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const openPopover = () => {
    // Land the highlight on the current selection so the open list reads
    // naturally as a select.
    const selectedIdx = options.findIndex((opt) => getValue(opt) === value);
    setActiveIndex(Math.max(selectedIdx, 0));
    setQuery('');
    setOpen(true);
  };

  const pick = (option: T) => {
    onChange(getValue(option));
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) pick(option);
    } else if (e.key === 'Escape') {
      if (query) {
        // First Escape clears the query; a second one closes the popover.
        e.preventDefault();
        e.stopPropagation();
        setQuery('');
        setActiveIndex(0);
      }
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? openPopover() : close())}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('w-full justify-between font-normal', className)}
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </span>
          ) : (
            selectedLabel
          )}
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          // Focus the search box, not the popover container.
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="relative border-b p-2">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="searchable-select-list"
            aria-activedescendant={
              filteredOptions[activeIndex]
                ? `searchable-select-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-9"
          />
        </div>
        <div
          id="searchable-select-list"
          ref={listRef}
          role="listbox"
          aria-label={searchPlaceholder}
          className="max-h-[300px] overflow-y-auto p-1"
        >
          {filteredOptions.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option, idx) => {
              const isActive = idx === activeIndex;
              const isSelected = getValue(option) === value;
              return (
                <div
                  key={getValue(option)}
                  id={`searchable-select-option-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive || undefined}
                  onClick={() => pick(option)}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex w-full cursor-pointer items-center rounded-sm px-2 py-2 text-sm',
                    isActive && 'bg-accent',
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4 shrink-0',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {getLabel(option)}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
