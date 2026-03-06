'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function GlobalSearch() {
  return (
    <div className="relative hidden max-w-md flex-1 items-center md:flex">
      <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
      <Input
        type="search"
        placeholder="Search orders, products, customers..."
        className="bg-muted h-9 w-full border-0 pl-9 focus-visible:ring-1"
      />
      <kbd className="bg-muted pointer-events-none absolute right-2 hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </div>
  );
}
