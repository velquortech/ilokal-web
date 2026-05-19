'use client';

import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProductResponse } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ViewProduct } from '../view-product';
import { ProductActions } from './product-actions';

export const columns: ColumnDef<ProductResponse>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'image_url',
    header: 'Image',
    cell: ({ row }) => (
      <ViewProduct {...row.original}>
        <div className="group relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border">
          <Image
            src={row.original.image_url ?? '/placeholder.png'}
            alt={row.original.name}
            fill
            sizes="48px"
            className="object-cover transition group-hover:scale-105"
          />
        </div>
      </ViewProduct>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {row.original.description}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category?.name ?? '—'}</Badge>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => <span>₱{row.original.price}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div
        className={cn(
          'inline-flex h-max items-center rounded-sm px-2 py-0.5 text-xs capitalize',
          row.original.status === 'active' && 'bg-green-600/10 text-green-700',
          row.original.status === 'inactive' && 'bg-red-600/10 text-red-700',
          row.original.status === 'archived' &&
            'bg-muted text-muted-foreground',
        )}
      >
        {row.original.status}
      </div>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row: { original: product } }) => <ProductActions {...product} />,
  },
];
