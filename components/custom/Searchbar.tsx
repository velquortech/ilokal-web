'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, onSearch, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onSearch) onSearch(e.target.value);
    };

    return (
      <div className="relative w-full min-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 -mt-0.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search here..."
          className={cn('pl-10', className)}
          ref={ref}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';

export { SearchBar };
