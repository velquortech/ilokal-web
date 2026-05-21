'use client';

import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculatePercentage } from '@/lib/product-helper';
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
          {row.original.image_url ? (
            <Image
              src={row.original.image_url}
              alt={row.original.name}
              fill
              sizes="48px"
              unoptimized
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
              <ImageOff className="size-5" />
            </div>
          )}
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
    header: 'Catalogue',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category?.name ?? '—'}</Badge>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const { price, sale_price } = row.original;
      if (sale_price !== null && sale_price !== undefined) {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-primary font-semibold">₱{sale_price}</span>
            <span className="text-muted-foreground text-xs line-through">
              ₱{price} (-{calculatePercentage(price, sale_price)}%)
            </span>
          </div>
        );
      }
      return <span>₱{price}</span>;
    },
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
