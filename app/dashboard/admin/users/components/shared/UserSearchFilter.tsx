import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

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
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
  onReset,
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
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Status Filter Dropdown */}
        <div className="md:w-48">
          <label
            htmlFor="status-filter"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(
                e.target.value as 'all' | 'active' | 'inactive' | 'suspended',
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Sort Filter Dropdown */}
        <div className="md:w-48">
          <label
            htmlFor="sort-filter"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Sort by
          </label>
          <select
            id="sort-filter"
            value={sortOrder}
            onChange={(e) =>
              onSortOrderChange(e.target.value as 'latest' | 'oldest')
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={onReset} className="gap-2">
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-600">
          <span>Filters applied:</span>
          {searchQuery && (
            <span className="ml-2 font-medium">"Search: {searchQuery}"</span>
          )}
          {statusFilter !== 'all' && (
            <span className="ml-2 font-medium">Status: {statusFilter}</span>
          )}
          {sortOrder !== 'latest' && (
            <span className="ml-2 font-medium">Sort: {sortOrder}</span>
          )}
        </div>
      )}
    </div>
  );
}
