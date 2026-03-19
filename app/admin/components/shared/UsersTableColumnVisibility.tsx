'use client';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, EyeOff } from 'lucide-react';
import { columnNames } from './UsersTableColumns';

interface UsersTableColumnVisibilityProps<TRow> {
  table: Table<TRow>;
}

export function UsersTableColumnVisibility<TRow>({
  table,
}: UsersTableColumnVisibilityProps<TRow>) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {table.getAllLeafColumns().map((column) => {
        if (
          !column.getCanHide() ||
          column.id === 'actions' ||
          column.id === 'index'
        ) {
          return null;
        }
        const displayName = columnNames[column.id] || column.id;
        return (
          <Tooltip key={column.id} delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={column.getIsVisible() ? 'default' : 'outline'}
                onClick={() => column.toggleVisibility()}
                className="gap-2"
                aria-label={`Toggle ${displayName} column visibility`}
              >
                {column.getIsVisible() ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="text-xs">{displayName}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="border-slate-700 bg-slate-950 text-white"
            >
              <p className="text-sm">
                {column.getIsVisible() ? 'Hide' : 'Show'}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
