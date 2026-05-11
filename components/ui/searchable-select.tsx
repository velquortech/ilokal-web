'use client';

import { useState, useMemo } from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
}

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
}: SearchableSelectProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = options.find((opt) => getValue(opt) === value);
  const selectedLabel = selectedItem ? getLabel(selectedItem) : placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      getLabel(option).toLowerCase().includes(query),
    );
  }, [options, searchQuery, getLabel]);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
    }
  };

  return (
    <Select
      value={value}
      onValueChange={handleValueChange}
      onOpenChange={handleOpenChange}
      disabled={disabled || loading}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder}>
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : (
            selectedLabel
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="w-[var(--radix-select-trigger-width)] p-0"
        position="popper"
      >
        <div className="bg-popover sticky top-0 z-10 border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="placeholder:text-muted-foreground w-full rounded-sm border-0 bg-transparent py-2 pr-2 pl-8 text-sm outline-none focus:ring-0"
              onKeyDown={(e) => {
                // Prevent select from closing when typing in search
                e.stopPropagation();
              }}
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center text-sm">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem
                key={getValue(option)}
                value={getValue(option)}
                className="cursor-pointer"
              >
                <span className="flex items-center">
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === getValue(option) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {getLabel(option)}
                </span>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}
