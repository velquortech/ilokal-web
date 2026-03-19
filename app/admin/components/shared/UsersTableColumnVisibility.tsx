'use client';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, EyeOff, Settings2, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { columnNames } from './UsersTableColumns';

interface UsersTableColumnVisibilityProps<TRow> {
  table: Table<TRow>;
}

export function UsersTableColumnVisibility<TRow>({
  table,
}: UsersTableColumnVisibilityProps<TRow>) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const hidableColumns = table
    .getAllLeafColumns()
    .filter(
      (col) => col.getCanHide() && col.id !== 'actions' && col.id !== 'index',
    );

  const visibleCount = hidableColumns.filter((col) =>
    col.getIsVisible(),
  ).length;
  const hiddenCount = hidableColumns.length - visibleCount;

  const handleShowAll = () => {
    hidableColumns.forEach(
      (col) =>
        col.columnDef.enableHiding !== false && col.toggleVisibility(true),
    );
  };

  const handleHideAll = () => {
    hidableColumns.forEach(
      (col) =>
        col.columnDef.enableHiding !== false && col.toggleVisibility(false),
    );
  };

  if (hidableColumns.length === 0) {
    return null;
  }

  // Collapsed view - just show an icon button
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCollapsed(false)}
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white p-0 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md"
            aria-label="Expand column visibility settings"
            aria-expanded="false"
          >
            <Settings2 className="h-4 w-4 text-slate-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">Column Visibility</p>
          <p className="text-slate-300">
            {visibleCount} of {hidableColumns.length} visible
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-linear-to-br from-slate-50 to-slate-100 shadow-sm transition-all duration-200">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <Settings2 className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Column Visibility
            </h3>
            <p className="text-xs text-slate-500">
              {visibleCount} of {hidableColumns.length} visible
              {hiddenCount > 0 && ` • ${hiddenCount} hidden`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Actions */}
          {visibleCount > 0 && hiddenCount > 0 && (
            <div className="flex gap-1.5 border-r border-gray-300 pr-1.5">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleShowAll}
                    className="h-7 px-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900"
                    aria-label="Show all columns"
                  >
                    Show All
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Show all columns
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleHideAll}
                    className="h-7 px-2 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900"
                    aria-label="Hide all columns"
                  >
                    Hide All
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Hide all columns
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Collapse Button */}
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCollapsed(true)}
                className="h-7 w-7 p-0 text-slate-600 hover:bg-white hover:text-slate-900"
                aria-label="Collapse column visibility settings"
                aria-expanded="true"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Collapse
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="flex flex-wrap gap-2 p-3">
        {hidableColumns.map((column) => {
          const isVisible = column.getIsVisible();
          const displayName = columnNames[column.id] || column.id;

          return (
            <Tooltip key={column.id} delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => column.toggleVisibility()}
                  className={`group relative h-8 gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all duration-200 ease-out ${
                    isVisible
                      ? 'border border-gray-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md'
                      : 'border border-gray-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-100'
                  } `}
                  aria-label={`${isVisible ? 'Hide' : 'Show'} ${displayName} column`}
                  aria-pressed={isVisible}
                >
                  {isVisible ? (
                    <Eye className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 opacity-60 transition-all group-hover:opacity-100" />
                  )}
                  <span
                    className={isVisible ? 'text-slate-700' : 'text-slate-500'}
                  >
                    {displayName}
                  </span>
                  {!isVisible && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-900 text-white"
              >
                <p className="text-xs font-medium">
                  {isVisible ? 'Click to hide' : 'Click to show'} this column
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
