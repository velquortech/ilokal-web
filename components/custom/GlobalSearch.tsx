'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function GlobalSearch() {
  return (
    <div className="relative hidden w-full max-w-md flex-1 items-center md:flex">
      <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
      <Input
        type="search"
        placeholder="Search here..."
        className="bg-muted h-9 w-full border-0 pl-9 focus-visible:ring-1"
      />
    </div>
  );
}
