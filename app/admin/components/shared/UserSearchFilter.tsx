'use client';

import { Search } from 'lucide-react';

interface UserSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'active' | 'inactive' | 'suspended';
  onStatusFilterChange: (
    status: 'all' | 'active' | 'inactive' | 'suspended',
  ) => void;
  sortOrder: 'latest' | 'oldest';
  onSortOrderChange: (order: 'latest' | 'oldest') => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function UserSearchFilter({
  searchQuery,
  onSearchChange,
  hasActiveFilters,
}: UserSearchFilterProps) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        {/* Search Input */}
        <div className="flex-1">
          <label
            htmlFor="search-input"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              suppressHydrationWarning
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-600">
          <span>Filters applied:</span>
          {searchQuery && (
            <span className="ml-2 font-medium">"Search: {searchQuery}"</span>
          )}
        </div>
      )}
    </div>
  );
}
