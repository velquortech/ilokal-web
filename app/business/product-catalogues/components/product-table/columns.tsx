'use client';

import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Product } from '@/app/business/libs/types/product.type';
import { Checkbox } from '@/components/ui/checkbox';
import { ViewProduct } from '../view-product';
import { ProductActions } from './product-actions';
import { calculateSalePercentage } from '@/app/business/libs/helper';

export const columns: ColumnDef<Product>[] = [
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
    accessorKey: 'image',
    header: 'Image',
    cell: ({ row }) => (
      <ViewProduct {...row.original}>
        <div className="group relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-md border">
          <Image
            src={row.original.image}
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
    accessorKey: 'catalogue',
    header: 'Catalogue',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.catalogue.name}</Badge>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const { price, salePrice } = row.original;
      return salePrice ? (
        <div className="flex flex-col">
          <span className="text-primary text-sm font-bold">₱{salePrice}</span>
          <span className="text-muted-foreground text-xs line-through">
            ₱{price}
          </span>
        </div>
      ) : (
        <span>₱{price}</span>
      );
    },
  },
  {
    id: 'tags',
    header: 'Tags/Sale',
    cell: ({ row }) => {
      const discount = calculateSalePercentage(
        row.original.price,
        row.original.salePrice,
      );
      return (
        <div className="flex gap-2">
          {row.original.badge && <Badge>{row.original.badge}</Badge>}
          {discount && <Badge variant="destructive">-{discount}%</Badge>}
        </div>
      );
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
          row.original.status === 'unlisted' && 'bg-red-600/10 text-red-700',
          row.original.status === 'disabled' &&
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
