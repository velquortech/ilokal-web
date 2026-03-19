'use client';
import { HeaderGroup } from '@tanstack/react-table';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminUser } from '@/lib/types/admin';

interface UsersTableHeaderProps {
  headerGroups: HeaderGroup<AdminUser>[];
}

export function UsersTableHeader({ headerGroups }: UsersTableHeaderProps) {
  return (
    <TableHeader className="bg-gray-50">
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header, index) => {
            const isLastHeader = index === headerGroup.headers.length - 1;
            return (
              <TableHead
                key={header.id}
                className={`font-semibold ${isLastHeader ? 'text-right' : ''}`}
                scope="col"
                style={{
                  width: header.getSize(),
                }}
              >
                <div
                  className={
                    header.column.getCanSort()
                      ? 'flex cursor-pointer items-center gap-2 select-none'
                      : ''
                  }
                  onClick={header.column.getToggleSortingHandler()}
                  role={header.column.getCanSort() ? 'button' : undefined}
                  tabIndex={header.column.getCanSort() ? 0 : undefined}
                  aria-sort={
                    header.column.getIsSorted()
                      ? header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'ascending'
                      : 'none'
                  }
                  onKeyDown={(e) => {
                    if (
                      header.column.getCanSort() &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      header.column.getToggleSortingHandler?.();
                    }
                  }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  {{
                    asc: <ArrowUp className="h-4 w-4" />,
                    desc: <ArrowDown className="h-4 w-4" />,
                  }[header.column.getIsSorted() as string] ??
                    (header.column.getCanSort() && (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    ))}
                </div>
              </TableHead>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
}
