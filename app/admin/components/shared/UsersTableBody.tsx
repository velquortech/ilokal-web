'use client';
import { Row } from '@tanstack/react-table';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import { AdminUser } from '@/lib/types/admin';

interface UsersTableBodyProps {
  rows: Row<AdminUser>[];
  columnsLength: number;
}

export function UsersTableBody({ rows, columnsLength }: UsersTableBodyProps) {
  return (
    <TableBody>
      {rows.length > 0 ? (
        rows.map((row) => (
          <TableRow key={row.id} className="hover:bg-gray-50">
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                style={{
                  width: cell.column.getSize(),
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell
            colSpan={columnsLength}
            className="text-Gray-600 h-24 text-center"
          >
            No results
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}
